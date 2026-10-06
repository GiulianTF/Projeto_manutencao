import { Link } from 'react-router-dom';
import { todayISO } from '@/lib/date';
import { OccurrenceItem } from './OccurrenceItem';
import { useOccurrences } from './useOccurrences';

/** Card do dashboard com as rotinas programadas para hoje. */
export function TodayRoutines() {
  const today = todayISO();
  const { items, routines } = useOccurrences(today, today);

  if (!routines.length) return null;
  const done = items.filter((i) => i.status === 'concluida').length;

  return (
    <section className="card panel">
      <header className="panel__header">
        <h2 className="card__title">
          Rotinas de hoje{' '}
          <span className="text-muted">
            ({done}/{items.length})
          </span>
        </h2>
        <Link to="/rotinas">Ver semana</Link>
      </header>
      {items.length ? (
        <div className="occurrence-list">
          {items.map((item) => (
            <OccurrenceItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-muted">Nenhuma rotina programada para hoje.</p>
      )}
    </section>
  );
}
