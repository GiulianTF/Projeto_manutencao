// Implementação local (localStorage + IndexedDB) usada enquanto o Supabase
// não está configurado. Sincroniza entre abas, o que permite simular dois usuários.

import { compareRoutines, WEEKDAY_ORDER } from '@/types/domain';
import type {
  BackupData,
  Demand,
  DemandHistoryEntry,
  DemandInput,
  DemandPhoto,
  OccurrencePatch,
  PhotoKind,
  Profile,
  Routine,
  RoutineInput,
  RoutineOccurrence,
} from '@/types/domain';
import { photoBlobs } from './idb';
import { todayISO } from '@/lib/date';
import { uuid } from '@/lib/id';
import { applyDemandRules, changesSchedule, diffForHistory, occurrenceDates } from './rules';
import type { DataStore, LocalTools } from './store';

const KEY = 'manutencao.localdb.v1';

interface LocalDB {
  profiles: Profile[];
  demands: Demand[];
  photos: DemandPhoto[];
  history: DemandHistoryEntry[];
  routines: Routine[];
  occurrences: RoutineOccurrence[];
  seq: { demand: number; history: number };
  currentUserId: string;
}

type StoredRoutine = Omit<Routine, 'weekdays'> & { weekdays?: number[]; weekday?: number };
type StoredLocalDB = Omit<LocalDB, 'routines'> & { routines: StoredRoutine[] };

function seed(): LocalDB {
  const me: Profile = {
    id: uuid(),
    full_name: 'Usuário local',
    role: 'admin',
    active: true,
    created_at: new Date().toISOString(),
  };
  return {
    profiles: [me],
    demands: [],
    photos: [],
    history: [],
    routines: [],
    occurrences: [],
    seq: { demand: 0, history: 0 },
    currentUserId: me.id,
  };
}

function load(): LocalDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StoredLocalDB;
      const routines = stored.routines.map((routine) => {
        const { weekday, weekdays: storedWeekdays, ...rest } = routine;
        const candidates = (storedWeekdays ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
        const selected = new Set(candidates.length ? candidates : [weekday ?? 1]);
        return { ...rest, weekdays: WEEKDAY_ORDER.filter((day) => selected.has(day)) };
      });
      const db: LocalDB = { ...stored, routines };
      if (stored.routines.some((routine) => routine.weekday !== undefined || !routine.weekdays?.length)) persist(db);
      return db;
    }
  } catch {
    // dados corrompidos ou storage bloqueado: recomeça
  }
  const db = seed();
  persist(db);
  return db;
}

function persist(db: LocalDB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
window.addEventListener('storage', (e) => {
  if (e.key === KEY) emit();
});

/** Lê, aplica a mutação, salva e notifica. */
function mutate<T>(fn: (db: LocalDB) => T): T {
  const db = load();
  const result = fn(db);
  persist(db);
  emit();
  return structuredClone(result);
}

function read<T>(fn: (db: LocalDB) => T): Promise<T> {
  return Promise.resolve(structuredClone(fn(load())));
}

function pushHistory(db: LocalDB, entry: Omit<DemandHistoryEntry, 'id' | 'created_at' | 'actor_id'>) {
  db.seq.history += 1;
  db.history.push({
    id: db.seq.history,
    actor_id: db.currentUserId,
    created_at: new Date().toISOString(),
    ...entry,
  });
}

function findDemand(db: LocalDB, id: string): Demand {
  const d = db.demands.find((x) => x.id === id);
  if (!d) throw new Error('Demanda não encontrada.');
  return d;
}

const urlCache = new Map<string, string>();

export const localStore: DataStore & LocalTools = {
  mode: 'local',

  currentUserId: () => read((db) => db.currentUserId),
  listProfiles: () => read((db) => db.profiles),
  async updateProfile(id, patch) {
    mutate((db) => {
      const p = db.profiles.find((x) => x.id === id);
      if (p) p.full_name = patch.full_name;
    });
  },

  listDemands: () => read((db) => [...db.demands].sort((a, b) => b.created_at.localeCompare(a.created_at))),
  getDemand: (id) => read((db) => db.demands.find((d) => d.id === id) ?? null),

  async createDemand(input: DemandInput) {
    return mutate((db) => {
      db.seq.demand += 1;
      const now = new Date().toISOString();
      const demand = applyDemandRules({
        ...input,
        id: uuid(),
        code: db.seq.demand,
        created_by: db.currentUserId,
        updated_by: db.currentUserId,
        created_at: now,
        updated_at: now,
      });
      db.demands.push(demand);
      pushHistory(db, { demand_id: demand.id, action: 'criou', field: null, old_value: null, new_value: null });
      return demand;
    });
  },

  async updateDemand(id, patch) {
    return mutate((db) => {
      const prev = findDemand(db, id);
      const next = applyDemandRules({
        ...prev,
        ...patch,
        updated_at: new Date().toISOString(),
        updated_by: db.currentUserId,
      });
      for (const change of diffForHistory(prev, next)) {
        pushHistory(db, { demand_id: id, action: 'alterou', ...change });
      }
      db.demands = db.demands.map((d) => (d.id === id ? next : d));
      return next;
    });
  },

  async deleteDemand(id) {
    const photos = mutate((db) => {
      const removed = db.photos.filter((p) => p.demand_id === id);
      db.demands = db.demands.filter((d) => d.id !== id);
      db.photos = db.photos.filter((p) => p.demand_id !== id);
      db.history = db.history.filter((h) => h.demand_id !== id);
      return removed;
    });
    await Promise.all(photos.map((p) => photoBlobs.delete(p.id)));
  },

  listPhotos: (demandId) =>
    read((db) => db.photos.filter((p) => !demandId || p.demand_id === demandId)),

  async addPhoto(demandId: string, kind: PhotoKind, image: Blob) {
    const id = uuid();
    await photoBlobs.put(id, image);
    return mutate((db) => {
      findDemand(db, demandId);
      const photo: DemandPhoto = {
        id,
        demand_id: demandId,
        kind,
        storage_path: `local/${id}`,
        caption: null,
        created_by: db.currentUserId,
        created_at: new Date().toISOString(),
      };
      db.photos.push(photo);
      pushHistory(db, { demand_id: demandId, action: 'foto_adicionada', field: null, old_value: null, new_value: kind });
      return photo;
    });
  },

  async removePhoto(photo) {
    await photoBlobs.delete(photo.id);
    mutate((db) => {
      db.photos = db.photos.filter((p) => p.id !== photo.id);
      pushHistory(db, {
        demand_id: photo.demand_id,
        action: 'foto_removida',
        field: null,
        old_value: photo.kind,
        new_value: null,
      });
    });
  },

  async photoUrl(photo) {
    const cached = urlCache.get(photo.id);
    if (cached) return cached;
    const blob = await photoBlobs.get(photo.id);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    urlCache.set(photo.id, url);
    return url;
  },

  listHistory: (demandId) =>
    read((db) => db.history.filter((h) => h.demand_id === demandId).sort((a, b) => a.id - b.id)),

  listRoutines: () => read((db) => [...db.routines].sort(compareRoutines)),

  async createRoutine(input: RoutineInput) {
    return mutate((db) => {
      const now = new Date().toISOString();
      const routine: Routine = { ...input, id: uuid(), created_at: now, updated_at: now };
      db.routines.push(routine);
      return routine;
    });
  },

  async updateRoutine(id, patch) {
    return mutate((db) => {
      const prev = db.routines.find((r) => r.id === id);
      if (!prev) throw new Error('Rotina não encontrada.');
      const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
      db.routines = db.routines.map((r) => (r.id === id ? next : r));
      if (changesSchedule(patch)) {
        const today = todayISO();
        db.occurrences = db.occurrences.filter(
          (o) => !(o.routine_id === id && o.status === 'pendente' && o.scheduled_date >= today),
        );
      }
      return next;
    });
  },

  async deleteRoutine(id) {
    mutate((db) => {
      db.routines = db.routines.filter((r) => r.id !== id);
      db.occurrences = db.occurrences.filter((o) => o.routine_id !== id);
    });
  },

  async generateOccurrences(from, until) {
    const db = load();
    const existing = new Set(db.occurrences.map((o) => `${o.routine_id}|${o.scheduled_date}`));
    const toAdd: RoutineOccurrence[] = [];
    for (const r of db.routines) {
      for (const date of occurrenceDates(r, from, until)) {
        if (existing.has(`${r.id}|${date}`)) continue;
        toAdd.push({
          id: uuid(),
          routine_id: r.id,
          scheduled_date: date,
          status: 'pendente',
          done_at: null,
          done_by: null,
          observations: null,
          time_spent_minutes: 0,
        });
      }
    }
    if (toAdd.length) mutate((d) => d.occurrences.push(...toAdd));
  },

  listOccurrences: (from, until) =>
    read((db) => db.occurrences.filter((o) => o.scheduled_date >= from && o.scheduled_date <= until)),

  async updateOccurrence(id, patch: OccurrencePatch) {
    mutate((db) => {
      const o = db.occurrences.find((x) => x.id === id);
      if (!o) return;
      Object.assign(o, patch);
      if (patch.status === 'concluida') {
        o.done_at = new Date().toISOString();
        o.done_by = db.currentUserId;
      } else if (patch.status) {
        o.done_at = null;
        o.done_by = null;
      }
    });
  },

  exportAll: () =>
    read(
      (db): BackupData => ({
        exported_at: new Date().toISOString(),
        profiles: db.profiles,
        demands: db.demands,
        demand_photos: db.photos,
        demand_history: db.history,
        routines: db.routines,
        routine_occurrences: db.occurrences,
      }),
    ),

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // ---------- LocalTools ----------
  async addProfile(fullName) {
    return mutate((db) => {
      const p: Profile = {
        id: uuid(),
        full_name: fullName,
        role: 'tecnico',
        active: true,
        created_at: new Date().toISOString(),
      };
      db.profiles.push(p);
      return p;
    });
  },

  async setCurrentUser(id) {
    mutate((db) => {
      db.currentUserId = id;
    });
  },

  async reset() {
    localStorage.removeItem(KEY);
    await photoBlobs.clear();
    urlCache.clear();
    load();
    emit();
  },
};
