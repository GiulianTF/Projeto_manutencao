import { Link } from 'react-router-dom';
import { OverdueBadge, PriorityBadge, StatusBadge } from '@/components/ui';
import { useProfiles } from '@/data/hooks';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import type { Demand } from '@/types/domain';
import { deadlineState } from './demandUtils';

interface DemandListProps {
  demands: Demand[];
  /** esconde colunas secundárias (uso em painéis do dashboard) */
  compact?: boolean;
}

/** Lista responsiva: tabela no desktop, cartões no celular. */
export function DemandList({ demands, compact }: DemandListProps) {
  const { nameOf } = useProfiles();

  return (
    <div className={`demand-list${compact ? ' demand-list--compact' : ''}`} role="table" aria-label="Demandas">
      <div className="demand-list__head" role="row">
        <span role="columnheader">Demanda</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Prioridade</span>
        <span role="columnheader">Prazo</span>
        {!compact && <span role="columnheader">Responsável</span>}
        {!compact && <span role="columnheader">Tempo</span>}
      </div>
      {demands.map((d) => {
        const deadline = deadlineState(d);
        return (
          <Link
            key={d.id}
            to={`/demandas/${d.id}`}
            role="row"
            className={`demand-row${deadline === 'overdue' ? ' demand-row--overdue' : ''}${
              deadline === 'soon' ? ' demand-row--soon' : ''
            }`}
          >
            <span className="demand-row__title" role="cell">
              <span className="demand-row__code">#{d.code}</span>
              {d.title}
            </span>
            <span role="cell" className="demand-row__status">
              <StatusBadge status={d.status} />
            </span>
            <span role="cell" className="demand-row__priority">
              <PriorityBadge priority={d.priority} />
            </span>
            <span role="cell" className="demand-row__due">
              <span className="demand-row__label">Prazo </span>
              {formatDate(d.due_date)}
              {deadline === 'overdue' && <OverdueBadge />}
            </span>
            {!compact && (
              <span role="cell" className="demand-row__responsible">
                <span className="demand-row__label">Resp. </span>
                {nameOf(d.responsible_id)}
              </span>
            )}
            {!compact && (
              <span role="cell" className="demand-row__time">
                <span className="demand-row__label">Tempo </span>
                {d.time_spent_minutes ? formatMinutes(d.time_spent_minutes) : '—'}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
