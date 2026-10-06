import { useProfiles, useStoreQuery } from '@/data/hooks';
import { store } from '@/data';
import { formatDateTime } from '@/lib/date';
import { describeHistory } from './history';

export function HistoryTimeline({ demandId }: { demandId: string }) {
  const { data: entries } = useStoreQuery(() => store.listHistory(demandId), [demandId]);
  const { nameOf } = useProfiles();

  if (!entries?.length) return <p className="text-muted">Sem registros.</p>;

  return (
    <ol className="timeline">
      {[...entries].reverse().map((e) => (
        <li key={e.id} className="timeline__item">
          <time className="timeline__time">{formatDateTime(e.created_at)}</time>
          <span>
            <strong>{nameOf(e.actor_id)}</strong> {describeHistory(e, nameOf)}.
          </span>
        </li>
      ))}
    </ol>
  );
}
