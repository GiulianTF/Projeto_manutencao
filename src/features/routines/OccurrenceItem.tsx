import { useEffect, useState } from 'react';
import { Check, MessageSquare, X } from 'lucide-react';
import { Button, Dialog, DurationInput, errorMessage, Field, useToast } from '@/components/ui';
import { store } from '@/data';
import { useProfiles } from '@/data/hooks';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import { OCCURRENCE_STATUS_LABEL, type OccurrencePatch, type OccurrenceStatus } from '@/types/domain';
import type { OccurrenceView } from './useOccurrences';

/** Linha de uma ocorrência: nome, responsável e botões grandes Feita / Não realizada. */
export function OccurrenceItem({ item, showDate }: { item: OccurrenceView; showDate?: boolean }) {
  const toast = useToast();
  const { nameOf } = useProfiles();
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function save(patch: OccurrencePatch, message?: string) {
    try {
      await store.updateOccurrence(item.id, patch);
      if (message) toast(message);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  function toggle(status: OccurrenceStatus) {
    const next = item.status === status ? 'pendente' : status;
    save({ status: next }, next === 'concluida' ? `"${item.routine.name}" feita` : undefined);
  }

  return (
    <div className={`occurrence occurrence--${item.status}`}>
      <div className="occurrence__info">
        <span className="occurrence__name">{item.routine.name}</span>
        <span className="occurrence__meta">
          {showDate && `${formatDate(item.scheduled_date)} · `}
          {nameOf(item.routine.responsible_id)}
          {item.status !== 'pendente' && ` · ${OCCURRENCE_STATUS_LABEL[item.status]}`}
          {item.time_spent_minutes > 0 && ` · ${formatMinutes(item.time_spent_minutes)}`}
        </span>
        {item.observations && <span className="occurrence__obs">{item.observations}</span>}
      </div>
      <div className="occurrence__actions">
        <button
          type="button"
          className="occurrence__btn occurrence__btn--done"
          aria-pressed={item.status === 'concluida'}
          onClick={() => toggle('concluida')}
          title="Marcar como feita"
        >
          <Check size={20} />
        </button>
        <button
          type="button"
          className="occurrence__btn occurrence__btn--skip"
          aria-pressed={item.status === 'nao_realizada'}
          onClick={() => toggle('nao_realizada')}
          title="Não realizada"
        >
          <X size={20} />
        </button>
        <button
          type="button"
          className="occurrence__btn"
          onClick={() => setDetailsOpen(true)}
          title="Observação e tempo"
          aria-label="Observação e tempo"
        >
          <MessageSquare size={18} />
        </button>
      </div>
      <OccurrenceDialog item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} onSave={save} />
    </div>
  );
}

function OccurrenceDialog(props: {
  item: OccurrenceView;
  open: boolean;
  onClose: () => void;
  onSave: (patch: OccurrencePatch, message?: string) => Promise<void>;
}) {
  const { item, open, onClose, onSave } = props;
  const [observations, setObservations] = useState('');
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (!open) return;
    setObservations(item.observations ?? '');
    setMinutes(item.time_spent_minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  async function handleSave() {
    await onSave({ observations: observations.trim() || null, time_spent_minutes: minutes }, 'Ocorrência atualizada');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${item.routine.name} — ${formatDate(item.scheduled_date)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="stack">
        {item.routine.description && <p className="text-muted">{item.routine.description}</p>}
        <Field label="Tempo gasto" as="div">
          <DurationInput value={minutes} onChange={setMinutes} />
        </Field>
        <Field label="Observações">
          <textarea className="textarea" value={observations} onChange={(e) => setObservations(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
