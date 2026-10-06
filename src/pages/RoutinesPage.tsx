import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button, EmptyState, errorMessage, Loading, PageHeader, useToast } from '@/components/ui';
import { store } from '@/data';
import { useProfiles } from '@/data/hooks';
import { OccurrenceItem } from '@/features/routines/OccurrenceItem';
import { RoutineFormDialog } from '@/features/routines/RoutineFormDialog';
import { useOccurrences } from '@/features/routines/useOccurrences';
import { addDays, formatDate, formatWeekdayShort, parseDateOnly, startOfWeekISO, todayISO } from '@/lib/date';
import { intervalLabel, WEEKDAY_LABEL, type Routine } from '@/types/domain';

type Tab = 'semana' | 'cadastro';

export function RoutinesPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('aba') === 'cadastro' ? 'cadastro' : 'semana';
  const weekStart = startOfWeekISO(params.get('semana') ?? todayISO());
  const [editing, setEditing] = useState<Routine | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function openForm(routine: Routine | null) {
    setEditing(routine);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Rotinas"
        subtitle="Atividades preventivas que se repetem"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus size={18} /> Nova rotina
          </Button>
        }
      />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" className="tabs__tab" aria-selected={tab === 'semana'} onClick={() => setParam('aba', null)}>
          Semana
        </button>
        <button
          type="button"
          role="tab"
          className="tabs__tab"
          aria-selected={tab === 'cadastro'}
          onClick={() => setParam('aba', 'cadastro')}
        >
          Rotinas cadastradas
        </button>
      </div>

      {tab === 'semana' ? (
        <WeekView weekStart={weekStart} onWeekChange={(w) => setParam('semana', w === startOfWeekISO(todayISO()) ? null : w)} onCreate={() => openForm(null)} />
      ) : (
        <RoutineCatalog onEdit={openForm} />
      )}

      <RoutineFormDialog open={formOpen} routine={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}

function WeekView(props: { weekStart: string; onWeekChange: (weekStart: string) => void; onCreate: () => void }) {
  const { weekStart, onWeekChange } = props;
  const weekEnd = addDays(weekStart, 6);
  const today = todayISO();
  const { items, routines, loading } = useOccurrences(weekStart, weekEnd);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const done = items.filter((i) => i.status === 'concluida').length;

  if (loading) return <Loading />;
  if (!routines.length) {
    return (
      <div className="card">
        <EmptyState icon={Repeat} title="Nenhuma rotina cadastrada">
          <p>Ex.: verificar lâmpadas toda segunda-feira.</p>
          <Button onClick={props.onCreate}>
            <Plus size={18} /> Cadastrar rotina
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="week-nav card">
        <Button variant="ghost" iconOnly onClick={() => onWeekChange(addDays(weekStart, -7))} aria-label="Semana anterior">
          <ChevronLeft size={20} />
        </Button>
        <div className="week-nav__label">
          <strong>
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </strong>
          <span className="text-muted">
            {done} de {items.length} feitas
          </span>
        </div>
        <Button variant="ghost" iconOnly onClick={() => onWeekChange(addDays(weekStart, 7))} aria-label="Próxima semana">
          <ChevronRight size={20} />
        </Button>
        {startOfWeekISO(today) !== weekStart && (
          <Button variant="secondary" onClick={() => onWeekChange(startOfWeekISO(today))}>
            Hoje
          </Button>
        )}
      </div>

      <div className="week-days">
        {days.map((day) => {
          const dayItems = items.filter((i) => i.scheduled_date === day);
          if (!dayItems.length) return null;
          return (
            <section key={day} className={`card week-day${day === today ? ' week-day--today' : ''}`}>
              <h3 className="week-day__title">
                <span className="week-day__weekday">{formatWeekdayShort(day)}</span>
                {parseDateOnly(day).getDate()}
                {day === today && <span className="badge badge--status-em_andamento">Hoje</span>}
              </h3>
              <div className="occurrence-list">
                {dayItems.map((item) => (
                  <OccurrenceItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
        {!items.length && <p className="text-muted">Nenhuma ocorrência nesta semana.</p>}
      </div>
    </div>
  );
}

function RoutineCatalog({ onEdit }: { onEdit: (routine: Routine) => void }) {
  const toast = useToast();
  const { nameOf } = useProfiles();
  const { routines, loading } = useOccurrences(todayISO(), todayISO());

  async function toggleActive(r: Routine) {
    try {
      await store.updateRoutine(r.id, { active: !r.active });
      toast(r.active ? 'Rotina desativada' : 'Rotina ativada');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function remove(r: Routine) {
    if (!confirm(`Excluir a rotina "${r.name}" e todo o seu histórico de ocorrências?`)) return;
    try {
      await store.deleteRoutine(r.id);
      toast('Rotina excluída');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  if (loading) return <Loading />;
  if (!routines.length) {
    return (
      <div className="card">
        <EmptyState icon={Repeat} title="Nenhuma rotina cadastrada" />
      </div>
    );
  }

  return (
    <div className="routine-list">
      {routines.map((r) => (
        <article key={r.id} className={`card routine-card${r.active ? '' : ' routine-card--inactive'}`}>
          <div className="routine-card__info">
            <h3 className="routine-card__name">{r.name}</h3>
            <p className="text-muted routine-card__meta">
              {WEEKDAY_LABEL[r.weekday]} · {intervalLabel(r.interval_weeks)} · {nameOf(r.responsible_id)}
            </p>
            {r.description && <p className="routine-card__desc">{r.description}</p>}
          </div>
          <div className="routine-card__actions">
            <label className="switch">
              <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
              <span>{r.active ? 'Ativa' : 'Inativa'}</span>
            </label>
            <Button variant="ghost" iconOnly onClick={() => onEdit(r)} aria-label="Editar rotina">
              <Pencil size={18} />
            </Button>
            <Button variant="ghost" iconOnly onClick={() => remove(r)} aria-label="Excluir rotina">
              <Trash2 size={18} />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
