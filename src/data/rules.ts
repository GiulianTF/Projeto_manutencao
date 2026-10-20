// Regras de negócio que o banco aplica via trigger (ver migration) —
// replicadas aqui para o modo local se comportar igual.

import { addDays, daysBetween, parseDateOnly } from '@/lib/date';
import type { Demand, Routine } from '@/types/domain';

export const HISTORY_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'opened_on',
  'due_date',
  'observations',
  'time_spent_minutes',
  'responsible_id',
] as const;

export type HistoryField = (typeof HISTORY_FIELDS)[number];

/** completed_at acompanha o status (igual ao trigger demands_before_write). */
export function applyDemandRules(d: Demand): Demand {
  if (d.status === 'concluido' && !d.completed_at) return { ...d, completed_at: new Date().toISOString() };
  if (d.status !== 'concluido' && d.completed_at) return { ...d, completed_at: null };
  return d;
}

export function diffForHistory(prev: Demand, next: Demand) {
  const changes: { field: HistoryField; old_value: string | null; new_value: string | null }[] = [];
  for (const field of HISTORY_FIELDS) {
    const a = prev[field];
    const b = next[field];
    if (a !== b) {
      changes.push({
        field,
        old_value: a === null || a === undefined ? null : String(a),
        new_value: b === null || b === undefined ? null : String(b),
      });
    }
  }
  return changes;
}

/** Datas em que a rotina acontece no intervalo (igual a generate_routine_occurrences). */
export function occurrenceDates(routine: Routine, from: string, until: string): string[] {
  if (!routine.active) return [];
  const dates: string[] = [];
  let d = from > routine.starts_on ? from : routine.starts_on;
  while (d <= until) {
    if (
      routine.weekdays.includes(parseDateOnly(d).getDay()) &&
      Math.floor(daysBetween(routine.starts_on, d) / 7) % routine.interval_weeks === 0
    ) {
      dates.push(d);
    }
    d = addDays(d, 1);
  }
  return dates;
}

/** A alteração mexe em quando a rotina acontece? (aí as ocorrências futuras são refeitas) */
export function changesSchedule(patch: Partial<Pick<Routine, 'weekdays' | 'interval_weeks' | 'starts_on' | 'active'>>) {
  return (
    patch.weekdays !== undefined ||
    patch.interval_weeks !== undefined ||
    patch.starts_on !== undefined ||
    patch.active !== undefined
  );
}
