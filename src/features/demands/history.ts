import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type DemandHistoryEntry,
  type DemandStatus,
  type Priority,
} from '@/types/domain';

const FIELD_LABEL: Record<string, string> = {
  title: 'o título',
  description: 'a descrição',
  priority: 'a prioridade',
  opened_on: 'a data de criação',
  due_date: 'o prazo',
  observations: 'as observações',
  time_spent_minutes: 'o tempo gasto',
  responsible_id: 'o responsável',
};

/** Texto da ação, sem o autor: "alterou o status para "Em andamento"". */
export function describeHistory(entry: DemandHistoryEntry, nameOf: (id: string | null) => string): string {
  switch (entry.action) {
    case 'criou':
      return 'criou a demanda';
    case 'foto_adicionada':
      return `adicionou foto ${entry.new_value ?? ''}`.trim();
    case 'foto_removida':
      return `removeu foto ${entry.old_value ?? ''}`.trim();
  }

  const v = entry.new_value;
  switch (entry.field) {
    case 'status':
      if (v === 'concluido') return 'marcou a demanda como concluída';
      if (v === 'cancelado') return 'cancelou a demanda';
      return `alterou o status para "${STATUS_LABEL[v as DemandStatus] ?? v}"`;
    case 'priority':
      return `alterou a prioridade para "${PRIORITY_LABEL[v as Priority] ?? v}"`;
    case 'due_date':
      return v ? `alterou o prazo para ${formatDate(v)}` : 'removeu o prazo';
    case 'opened_on':
      return `alterou a data de criação para ${formatDate(v)}`;
    case 'time_spent_minutes':
      return `registrou tempo gasto de ${formatMinutes(Number(v ?? 0))}`;
    case 'responsible_id':
      return v ? `definiu ${nameOf(v)} como responsável` : 'removeu o responsável';
    case 'observations':
      return v ? 'atualizou as observações' : 'limpou as observações';
    default:
      return `alterou ${FIELD_LABEL[entry.field ?? ''] ?? entry.field}`;
  }
}
