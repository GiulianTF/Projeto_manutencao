import { isDueSoon, isOverdue } from '@/lib/date';
import { isClosedStatus, type Demand, type DemandStatus, type Priority } from '@/types/domain';

export type DeadlineState = 'overdue' | 'soon' | null;

export function deadlineState(d: Pick<Demand, 'due_date' | 'status'>): DeadlineState {
  const closed = isClosedStatus(d.status);
  if (isOverdue(d.due_date, closed)) return 'overdue';
  if (isDueSoon(d.due_date, closed)) return 'soon';
  return null;
}

export type StatusFilter = DemandStatus | 'abertas' | '';
export type DeadlineFilter = '' | 'atrasadas' | 'proximas' | 'sem_prazo';

export interface DemandFilters {
  q: string;
  status: StatusFilter;
  priority: Priority | '';
  responsible: string;
  deadline: DeadlineFilter;
  from: string; // período (data de criação)
  to: string;
}

export const EMPTY_FILTERS: DemandFilters = {
  q: '',
  status: '',
  priority: '',
  responsible: '',
  deadline: '',
  from: '',
  to: '',
};

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filterDemands(list: Demand[], f: DemandFilters): Demand[] {
  const q = normalize(f.q.trim().replace(/^#/, ''));
  return list.filter((d) => {
    if (q) {
      const haystack = normalize(`${d.code} ${d.title} ${d.description ?? ''} ${d.observations ?? ''}`);
      if (!haystack.includes(q)) return false;
    }
    if (f.status === 'abertas' && isClosedStatus(d.status)) return false;
    if (f.status && f.status !== 'abertas' && d.status !== f.status) return false;
    if (f.priority && d.priority !== f.priority) return false;
    if (f.responsible === 'none' ? d.responsible_id : f.responsible && d.responsible_id !== f.responsible) {
      return false;
    }
    if (f.deadline === 'atrasadas' && deadlineState(d) !== 'overdue') return false;
    if (f.deadline === 'proximas' && deadlineState(d) !== 'soon') return false;
    if (f.deadline === 'sem_prazo' && d.due_date) return false;
    if (f.from && d.opened_on < f.from) return false;
    if (f.to && d.opened_on > f.to) return false;
    return true;
  });
}

const PRIORITY_WEIGHT: Record<Priority, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

/** Abertas primeiro (atrasadas no topo, depois por prazo e prioridade); fechadas por último. */
export function sortDemands(list: Demand[]): Demand[] {
  return [...list].sort((a, b) => {
    const closedA = isClosedStatus(a.status);
    const closedB = isClosedStatus(b.status);
    if (closedA !== closedB) return closedA ? 1 : -1;
    if (closedA) return b.updated_at.localeCompare(a.updated_at);
    const dueA = a.due_date ?? '9999-12-31';
    const dueB = b.due_date ?? '9999-12-31';
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}

export function countByStatus(list: Demand[]): Record<DemandStatus, number> {
  const counts: Record<DemandStatus, number> = {
    pendente: 0,
    em_andamento: 0,
    aguardando_material: 0,
    concluido: 0,
    cancelado: 0,
  };
  for (const d of list) counts[d.status] += 1;
  return counts;
}
