import { useEffect, useMemo } from 'react';
import { store } from '@/data';
import { useStoreQuery } from '@/data/hooks';
import { startOfWeekISO, todayISO } from '@/lib/date';
import type { Routine, RoutineOccurrence } from '@/types/domain';

export interface OccurrenceView extends RoutineOccurrence {
  routine: Routine;
}

/**
 * Ocorrências de rotina no intervalo, já com a rotina junto.
 * Gera as que faltam a partir da semana atual (o passado não é recriado).
 */
export function useOccurrences(from: string, until: string) {
  const { data: routines } = useStoreQuery(() => store.listRoutines(), []);
  const { data: occurrences, loading } = useStoreQuery(() => store.listOccurrences(from, until), [from, until]);

  // Assinatura do agendamento: regenera quando uma rotina muda
  const scheduleKey = (routines ?? [])
    .map((r) => `${r.id}:${r.weekdays.join(',')}:${r.interval_weeks}:${r.starts_on}:${r.active}`)
    .join('|');

  useEffect(() => {
    const thisWeek = startOfWeekISO(todayISO());
    const start = from > thisWeek ? from : thisWeek;
    if (start <= until) store.generateOccurrences(start, until).catch(() => undefined);
  }, [from, until, scheduleKey]);

  const items = useMemo(() => {
    const byId = new Map((routines ?? []).map((r) => [r.id, r]));
    return (occurrences ?? [])
      .filter((o) => byId.has(o.routine_id))
      .map((o) => ({ ...o, routine: byId.get(o.routine_id)! }))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.routine.name.localeCompare(b.routine.name));
  }, [occurrences, routines]);

  return { items, routines: routines ?? [], loading: loading && !occurrences };
}
