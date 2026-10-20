// Implementação Supabase. Regras (histórico, completed_at, geração de
// ocorrências) ficam no banco — ver supabase/migrations.

import type { SupabaseClient } from '@supabase/supabase-js';
import { compareRoutines } from '@/types/domain';
import type {
  BackupData,
  Demand,
  DemandHistoryEntry,
  DemandPhoto,
  OccurrencePatch,
  Profile,
  Routine,
  RoutineOccurrence,
} from '@/types/domain';
import { todayISO } from '@/lib/date';
import { uuid } from '@/lib/id';
import { changesSchedule } from './rules';
import type { DataStore } from './store';

const BUCKET = 'demand-photos';
const SIGNED_URL_TTL = 60 * 60; // 1h
const REALTIME_TABLES = ['demands', 'demand_photos', 'routines', 'routine_occurrences'];

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function createSupabaseStore(sb: SupabaseClient): DataStore {
  const listeners = new Set<() => void>();
  let channel: ReturnType<SupabaseClient['channel']> | null = null;
  let emitTimer: ReturnType<typeof setTimeout> | undefined;
  const urlCache = new Map<string, { url: string; expires: number }>();

  // Agrupa rajadas de eventos (eco do realtime + escrita local) num só refresh
  function emit() {
    clearTimeout(emitTimer);
    emitTimer = setTimeout(() => listeners.forEach((l) => l()), 120);
  }

  async function userId(): Promise<string | null> {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async function write<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
    const result = check(await promise);
    emit();
    return result;
  }

  return {
    mode: 'supabase',

    currentUserId: userId,

    async listProfiles() {
      return check<Profile[]>(await sb.from('profiles').select('*').order('full_name'));
    },

    async updateProfile(id, patch) {
      await write(sb.from('profiles').update(patch).eq('id', id));
    },

    async listDemands() {
      return check<Demand[]>(await sb.from('demands').select('*').order('created_at', { ascending: false }));
    },

    async getDemand(id) {
      return check<Demand | null>(await sb.from('demands').select('*').eq('id', id).maybeSingle());
    },

    async createDemand(input) {
      return write<Demand>(sb.from('demands').insert(input).select().single());
    },

    async updateDemand(id, patch) {
      return write<Demand>(sb.from('demands').update(patch).eq('id', id).select().single());
    },

    async deleteDemand(id) {
      const photos = check<DemandPhoto[]>(await sb.from('demand_photos').select('*').eq('demand_id', id));
      if (photos.length) await sb.storage.from(BUCKET).remove(photos.map((p) => p.storage_path));
      await write(sb.from('demands').delete().eq('id', id));
    },

    async listPhotos(demandId) {
      let query = sb.from('demand_photos').select('*').order('created_at');
      if (demandId) query = query.eq('demand_id', demandId);
      return check<DemandPhoto[]>(await query);
    },

    async addPhoto(demandId, kind, image) {
      const path = `demandas/${demandId}/${kind}/${uuid()}.jpg`;
      const upload = await sb.storage.from(BUCKET).upload(path, image, { contentType: 'image/jpeg' });
      if (upload.error) throw new Error(upload.error.message);
      return write<DemandPhoto>(
        sb.from('demand_photos').insert({ demand_id: demandId, kind, storage_path: path }).select().single(),
      );
    },

    async removePhoto(photo) {
      await sb.storage.from(BUCKET).remove([photo.storage_path]);
      urlCache.delete(photo.id);
      await write(sb.from('demand_photos').delete().eq('id', photo.id));
    },

    async photoUrl(photo) {
      const cached = urlCache.get(photo.id);
      if (cached && cached.expires > Date.now()) return cached.url;
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(photo.storage_path, SIGNED_URL_TTL);
      if (error || !data) return '';
      urlCache.set(photo.id, { url: data.signedUrl, expires: Date.now() + (SIGNED_URL_TTL - 60) * 1000 });
      return data.signedUrl;
    },

    async listHistory(demandId) {
      return check<DemandHistoryEntry[]>(
        await sb.from('demand_history').select('*').eq('demand_id', demandId).order('created_at').order('id'),
      );
    },

    async listRoutines() {
      return check<Routine[]>(await sb.from('routines').select('*')).sort(compareRoutines);
    },

    async createRoutine(input) {
      return write<Routine>(sb.from('routines').insert(input).select().single());
    },

    async updateRoutine(id, patch) {
      if (changesSchedule(patch)) {
        // Ocorrências futuras ainda pendentes seguem o novo agendamento
        check(
          await sb
            .from('routine_occurrences')
            .delete()
            .eq('routine_id', id)
            .eq('status', 'pendente')
            .gte('scheduled_date', todayISO()),
        );
      }
      return write<Routine>(
        sb.from('routines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single(),
      );
    },

    async deleteRoutine(id) {
      await write(sb.from('routines').delete().eq('id', id));
    },

    async generateOccurrences(from, until) {
      const { data, error } = await sb.rpc('generate_routine_occurrences', { p_from: from, p_until: until });
      if (error) throw new Error(error.message);
      if (data) emit();
    },

    async listOccurrences(from, until) {
      return check<RoutineOccurrence[]>(
        await sb
          .from('routine_occurrences')
          .select('*')
          .gte('scheduled_date', from)
          .lte('scheduled_date', until)
          .order('scheduled_date'),
      );
    },

    async updateOccurrence(id, patch: OccurrencePatch) {
      const full: Record<string, unknown> = { ...patch };
      if (patch.status === 'concluida') {
        full.done_at = new Date().toISOString();
        full.done_by = await userId();
      } else if (patch.status) {
        full.done_at = null;
        full.done_by = null;
      }
      await write(sb.from('routine_occurrences').update(full).eq('id', id));
    },

    async exportAll(): Promise<BackupData> {
      const all = async <T>(table: string) => check<T[]>(await sb.from(table).select('*'));
      return {
        exported_at: new Date().toISOString(),
        profiles: await all<Profile>('profiles'),
        demands: await all<Demand>('demands'),
        demand_photos: await all<DemandPhoto>('demand_photos'),
        demand_history: await all<DemandHistoryEntry>('demand_history'),
        routines: await all<Routine>('routines'),
        routine_occurrences: await all<RoutineOccurrence>('routine_occurrences'),
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      if (!channel) {
        channel = sb.channel('db-changes');
        for (const table of REALTIME_TABLES) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, emit);
        }
        channel.subscribe();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size && channel) {
          sb.removeChannel(channel);
          channel = null;
        }
      };
    },
  };
}
