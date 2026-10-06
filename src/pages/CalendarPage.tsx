import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';
import { store } from '@/data';
import { useStoreQuery } from '@/data/hooks';
import { deadlineState } from '@/features/demands/demandUtils';
import { useOccurrences } from '@/features/routines/useOccurrences';
import {
  addDays,
  addMonths,
  endOfMonthISO,
  formatDate,
  formatMonthYear,
  parseDateOnly,
  startOfMonthISO,
  startOfWeekISO,
  timestampToISODate,
  todayISO,
} from '@/lib/date';
import { OCCURRENCE_STATUS_LABEL, STATUS_LABEL } from '@/types/domain';

type EventKind = 'prazo' | 'atrasada' | 'concluida' | 'rotina';

interface CalendarEvent {
  key: string;
  date: string;
  kind: EventKind;
  label: string;
  detail: string;
  to: string;
}

const WEEK_HEADER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MAX_VISIBLE = 3;

export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const month = startOfMonthISO(params.get('mes') ? `${params.get('mes')}-01` : today);
  const monthEnd = endOfMonthISO(month);
  const gridStart = startOfWeekISO(month);
  const gridEnd = addDays(startOfWeekISO(monthEnd), 6);
  const [selected, setSelected] = useState<string>(today);

  const { data: demands = [] } = useStoreQuery(() => store.listDemands(), []);
  const { items: occurrences } = useOccurrences(gridStart, gridEnd);

  const eventsByDay = useMemo(() => {
    const events: CalendarEvent[] = [];
    for (const d of demands) {
      if (d.status === 'concluido' && d.completed_at) {
        events.push({
          key: `c-${d.id}`,
          date: timestampToISODate(d.completed_at),
          kind: 'concluida',
          label: d.title,
          detail: `#${d.code} · Concluída`,
          to: `/demandas/${d.id}`,
        });
      } else if (d.due_date && d.status !== 'cancelado') {
        events.push({
          key: `p-${d.id}`,
          date: d.due_date,
          kind: deadlineState(d) === 'overdue' ? 'atrasada' : 'prazo',
          label: d.title,
          detail: `#${d.code} · Prazo · ${STATUS_LABEL[d.status]}`,
          to: `/demandas/${d.id}`,
        });
      }
    }
    for (const o of occurrences) {
      events.push({
        key: `r-${o.id}`,
        date: o.scheduled_date,
        kind: 'rotina',
        label: o.routine.name,
        detail: `Rotina · ${OCCURRENCE_STATUS_LABEL[o.status]}`,
        to: `/rotinas?semana=${o.scheduled_date}`,
      });
    }
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (e.date < gridStart || e.date > gridEnd) continue;
      map.set(e.date, [...(map.get(e.date) ?? []), e]);
    }
    return map;
  }, [demands, occurrences, gridStart, gridEnd]);

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  function goToMonth(iso: string) {
    setParams(iso.slice(0, 7) === today.slice(0, 7) ? {} : { mes: iso.slice(0, 7) }, { replace: true });
    setSelected(iso.slice(0, 7) === today.slice(0, 7) ? today : iso);
  }

  const selectedEvents = eventsByDay.get(selected) ?? [];

  return (
    <>
      <PageHeader title="Calendário" subtitle="Prazos, rotinas e serviços concluídos" />

      <div className="card calendar">
        <div className="calendar__nav">
          <Button variant="ghost" iconOnly onClick={() => goToMonth(addMonths(month, -1))} aria-label="Mês anterior">
            <ChevronLeft size={20} />
          </Button>
          <h2 className="calendar__title">{formatMonthYear(month)}</h2>
          <Button variant="ghost" iconOnly onClick={() => goToMonth(addMonths(month, 1))} aria-label="Próximo mês">
            <ChevronRight size={20} />
          </Button>
          {month !== startOfMonthISO(today) && (
            <Button variant="secondary" onClick={() => goToMonth(today)}>
              Hoje
            </Button>
          )}
        </div>

        <div className="calendar__legend">
          <span className="cal-legend cal-legend--prazo">Prazo</span>
          <span className="cal-legend cal-legend--atrasada">Atrasada</span>
          <span className="cal-legend cal-legend--concluida">Concluída</span>
          <span className="cal-legend cal-legend--rotina">Rotina</span>
        </div>

        <div className="calendar__grid" role="grid">
          {WEEK_HEADER.map((w) => (
            <div key={w} className="calendar__weekday" role="columnheader">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const events = eventsByDay.get(day) ?? [];
            const outside = day < month || day > monthEnd;
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                className={[
                  'calendar__day',
                  outside && 'calendar__day--outside',
                  day === today && 'calendar__day--today',
                  day === selected && 'calendar__day--selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(day)}
                aria-label={`${formatDate(day)}: ${events.length} itens`}
              >
                <span className="calendar__date">{parseDateOnly(day).getDate()}</span>
                <span className="calendar__events">
                  {events.slice(0, MAX_VISIBLE).map((e) => (
                    <span key={e.key} className={`cal-event cal-event--${e.kind}`}>
                      {e.label}
                    </span>
                  ))}
                  {events.length > MAX_VISIBLE && <span className="cal-more">+{events.length - MAX_VISIBLE}</span>}
                </span>
                {events.length > 0 && (
                  <span className="calendar__dots" aria-hidden>
                    {[...new Set(events.map((e) => e.kind))].map((k) => (
                      <span key={k} className={`cal-dot cal-dot--${k}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="card calendar-day-list">
        <h2 className="card__title">{formatDate(selected)}</h2>
        {selectedEvents.length ? (
          <ul className="event-list">
            {selectedEvents.map((e) => (
              <li key={e.key}>
                <Link to={e.to} className={`event-list__item cal-event--${e.kind}`}>
                  {e.kind === 'rotina' ? <Repeat size={16} /> : e.kind === 'concluida' ? <CheckCircle2 size={16} /> : null}
                  <span className="event-list__label">{e.label}</span>
                  <span className="event-list__detail">{e.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nada programado para este dia.</p>
        )}
      </section>
    </>
  );
}
