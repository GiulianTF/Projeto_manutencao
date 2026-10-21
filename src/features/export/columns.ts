// Colunas exportadas. Usadas pelo layout padrão e para acrescentar os campos
// novos ao lado do modelo original quando ele estiver presente.

import { isOverdue, parseDateOnly, timestampToISODate } from '@/lib/date';
import {
  intervalLabel,
  isClosedStatus,
  OCCURRENCE_STATUS_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  WEEKDAY_LABEL,
  type Demand,
  type Routine,
  type RoutineOccurrence,
  weekdaysLabel,
} from '@/types/domain';

export type CellValue = string | number | Date | null;

export interface ColumnDef<T> {
  key: string;
  header: string;
  width: number;
  numFmt?: string;
  wrap?: boolean;
  value: (row: T) => CellValue;
}

export interface ExportContext {
  nameOf: (id: string | null) => string;
}

export const DATE_FMT = 'dd/mm/yyyy';
/** Tempo como fração de dia: soma corretamente acima de 24h */
export const DURATION_FMT = '[h]:mm';

// Excel não tem fuso: datas vão como meia-noite UTC para não "voltar um dia"
const utcDate = (iso: string) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
const dateOrNull = (iso: string | null) => (iso ? utcDate(iso) : null);
const timestampOrNull = (ts: string | null) => (ts ? utcDate(timestampToISODate(ts)) : null);
const minutesToDays = (m: number) => (m ? m / 1440 : null);

export function demandSituation(d: Demand): string {
  if (d.status === 'concluido') return 'Concluída';
  if (d.status === 'cancelado') return 'Cancelada';
  if (isOverdue(d.due_date, isClosedStatus(d.status))) return 'Atrasada';
  return d.due_date ? 'No prazo' : 'Sem prazo';
}

export function demandColumns(ctx: ExportContext): ColumnDef<Demand>[] {
  return [
    { key: 'code', header: 'Nº', width: 7, value: (d) => d.code },
    { key: 'title', header: 'Atividade', width: 38, wrap: true, value: (d) => d.title },
    { key: 'description', header: 'Descrição', width: 44, wrap: true, value: (d) => d.description },
    { key: 'opened_on', header: 'Data de criação', width: 14, numFmt: DATE_FMT, value: (d) => dateOrNull(d.opened_on) },
    { key: 'due_date', header: 'Prazo', width: 13, numFmt: DATE_FMT, value: (d) => dateOrNull(d.due_date) },
    { key: 'status', header: 'Status', width: 20, value: (d) => STATUS_LABEL[d.status] },
    { key: 'priority', header: 'Prioridade', width: 12, value: (d) => PRIORITY_LABEL[d.priority] },
    { key: 'responsible', header: 'Responsável', width: 20, value: (d) => ctx.nameOf(d.responsible_id) },
    { key: 'completed_at', header: 'Data de conclusão', width: 16, numFmt: DATE_FMT, value: (d) => timestampOrNull(d.completed_at) },
    { key: 'time_spent', header: 'Tempo gasto', width: 12, numFmt: DURATION_FMT, value: (d) => minutesToDays(d.time_spent_minutes) },
    { key: 'observations', header: 'Observações', width: 44, wrap: true, value: (d) => d.observations },
    { key: 'situation', header: 'Situação', width: 12, value: demandSituation },
  ];
}

export function routineColumns(ctx: ExportContext): ColumnDef<Routine>[] {
  return [
    { key: 'name', header: 'Rotina', width: 34, wrap: true, value: (r) => r.name },
    { key: 'description', header: 'Descrição', width: 44, wrap: true, value: (r) => r.description },
    { key: 'weekdays', header: 'Dias da semana', width: 36, wrap: true, value: (r) => weekdaysLabel(r.weekdays) },
    { key: 'interval', header: 'Periodicidade', width: 18, value: (r) => intervalLabel(r.interval_weeks) },
    { key: 'responsible', header: 'Responsável', width: 20, value: (r) => ctx.nameOf(r.responsible_id) },
    { key: 'starts_on', header: 'Início', width: 12, numFmt: DATE_FMT, value: (r) => dateOrNull(r.starts_on) },
    { key: 'active', header: 'Ativa', width: 8, value: (r) => (r.active ? 'Sim' : 'Não') },
  ];
}

export type OccurrenceRow = RoutineOccurrence & { routine: Routine };

export function occurrenceColumns(ctx: ExportContext): ColumnDef<OccurrenceRow>[] {
  return [
    { key: 'date', header: 'Data', width: 12, numFmt: DATE_FMT, value: (o) => dateOrNull(o.scheduled_date) },
    { key: 'weekday', header: 'Dia', width: 14, value: (o) => WEEKDAY_LABEL[parseDateOnly(o.scheduled_date).getDay()] },
    { key: 'routine', header: 'Rotina', width: 34, wrap: true, value: (o) => o.routine.name },
    { key: 'responsible', header: 'Responsável', width: 20, value: (o) => ctx.nameOf(o.routine.responsible_id) },
    { key: 'status', header: 'Status', width: 14, value: (o) => OCCURRENCE_STATUS_LABEL[o.status] },
    { key: 'done_by', header: 'Feita por', width: 20, value: (o) => (o.done_by ? ctx.nameOf(o.done_by) : null) },
    { key: 'time_spent', header: 'Tempo gasto', width: 12, numFmt: DURATION_FMT, value: (o) => minutesToDays(o.time_spent_minutes) },
    { key: 'observations', header: 'Observações', width: 44, wrap: true, value: (o) => o.observations },
  ];
}
