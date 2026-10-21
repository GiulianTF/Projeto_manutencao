// Tipos de domínio — espelham o schema em supabase/migrations.

export const DEMAND_STATUSES = [
  'pendente',
  'em_andamento',
  'aguardando_material',
  'concluido',
  'cancelado',
] as const;
export type DemandStatus = (typeof DEMAND_STATUSES)[number];

export const STATUS_LABEL: Record<DemandStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  aguardando_material: 'Aguardando material',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export type PhotoKind = 'antes' | 'depois';

export type UserRole = 'admin' | 'tecnico';

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Demand {
  id: string;
  code: number;
  title: string;
  description: string | null;
  status: DemandStatus;
  priority: Priority;
  opened_on: string; // data de criação (date, editável)
  due_date: string | null; // prazo (date)
  completed_at: string | null;
  observations: string | null;
  time_spent_minutes: number;
  responsible_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandPhoto {
  id: string;
  demand_id: string;
  kind: PhotoKind;
  storage_path: string;
  caption: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DemandHistoryEntry {
  id: number;
  demand_id: string;
  actor_id: string | null;
  action: 'criou' | 'alterou' | 'foto_adicionada' | 'foto_removida';
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const WEEKDAY_LABEL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const WEEKDAY_SHORT_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  weekdays: number[]; // dias selecionados: 0 = domingo … 6 = sábado
  interval_weeks: number; // 1 = semanal, 2 = quinzenal…
  starts_on: string;
  responsible_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** "Segunda, Quarta e Sexta" — passe WEEKDAY_SHORT_LABEL para a forma curta ("Seg, Qua e Sex"). */
export function weekdaysLabel(weekdays: readonly number[], names: readonly string[] = WEEKDAY_LABEL): string {
  const labels = WEEKDAY_ORDER.filter((day) => weekdays.includes(day)).map((day) => names[day]);
  if (labels.length < 2) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function compareRoutines(a: Routine, b: Routine): number {
  const firstA = WEEKDAY_ORDER.findIndex((day) => a.weekdays.includes(day));
  const firstB = WEEKDAY_ORDER.findIndex((day) => b.weekdays.includes(day));
  return (firstA < 0 ? WEEKDAY_ORDER.length : firstA) - (firstB < 0 ? WEEKDAY_ORDER.length : firstB) || a.name.localeCompare(b.name);
}

export type OccurrenceStatus = 'pendente' | 'concluida' | 'nao_realizada';

export interface RoutineOccurrence {
  id: string;
  routine_id: string;
  scheduled_date: string;
  status: OccurrenceStatus;
  done_at: string | null;
  done_by: string | null;
  observations: string | null;
  time_spent_minutes: number;
}

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  pendente: 'Pendente',
  concluida: 'Feita',
  nao_realizada: 'Não realizada',
};

export const INTERVAL_OPTIONS = [
  { value: 1, label: 'Semanal' },
  { value: 2, label: 'Quinzenal' },
  { value: 3, label: 'A cada 3 semanas' },
  { value: 4, label: 'A cada 4 semanas' },
] as const;

export function intervalLabel(weeks: number): string {
  return INTERVAL_OPTIONS.find((o) => o.value === weeks)?.label ?? `A cada ${weeks} semanas`;
}

/** Concluída ou cancelada: não conta para atraso. */
export function isClosedStatus(status: DemandStatus): boolean {
  return status === 'concluido' || status === 'cancelado';
}

// ---------- Entradas de escrita ----------

export interface DemandInput {
  title: string;
  description: string | null;
  status: DemandStatus;
  priority: Priority;
  opened_on: string;
  due_date: string | null;
  completed_at: string | null;
  observations: string | null;
  time_spent_minutes: number;
  responsible_id: string | null;
}

export interface RoutineInput {
  name: string;
  description: string | null;
  weekdays: number[];
  interval_weeks: number;
  starts_on: string;
  responsible_id: string | null;
  active: boolean;
}

export interface OccurrencePatch {
  status?: OccurrenceStatus;
  observations?: string | null;
  time_spent_minutes?: number;
}

/** Cópia completa dos dados (backup JSON). */
export interface BackupData {
  exported_at: string;
  profiles: Profile[];
  demands: Demand[];
  demand_photos: DemandPhoto[];
  demand_history: DemandHistoryEntry[];
  routines: Routine[];
  routine_occurrences: RoutineOccurrence[];
}
