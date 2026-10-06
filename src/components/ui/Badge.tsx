import { PRIORITY_LABEL, STATUS_LABEL, type DemandStatus, type Priority } from '@/types/domain';

export function StatusBadge({ status }: { status: DemandStatus }) {
  return (
    <span className={`badge badge--status-${status}`}>
      <span className="badge__dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge badge--priority-${priority}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function OverdueBadge() {
  return <span className="badge badge--overdue">Atrasada</span>;
}

export function DueSoonBadge() {
  return <span className="badge badge--due-soon">Vence em breve</span>;
}
