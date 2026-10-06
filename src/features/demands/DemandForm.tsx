import { useState, type FormEvent } from 'react';
import { Button, DurationInput, Field, PriorityPicker, StatusPicker } from '@/components/ui';
import { useProfiles } from '@/data/hooks';
import { dateToTimestamp, timestampToISODate, todayISO } from '@/lib/date';
import type { Demand, DemandInput } from '@/types/domain';
import { PendingPhotos, PhotoPicker } from './PhotoPicker';

interface DemandFormProps {
  initial?: Demand;
  /** responsável sugerido para nova demanda */
  defaultResponsibleId?: string | null;
  submitLabel: string;
  onSubmit: (input: DemandInput, photosBefore: File[]) => Promise<void>;
  onCancel: () => void;
}

function toInput(d?: Demand, responsibleId?: string | null): DemandInput {
  return {
    title: d?.title ?? '',
    description: d?.description ?? null,
    status: d?.status ?? 'pendente',
    priority: d?.priority ?? 'normal',
    opened_on: d?.opened_on ?? todayISO(),
    due_date: d?.due_date ?? null,
    completed_at: d?.completed_at ?? null,
    observations: d?.observations ?? null,
    time_spent_minutes: d?.time_spent_minutes ?? 0,
    responsible_id: d ? d.responsible_id : (responsibleId ?? null),
  };
}

export function DemandForm({ initial, defaultResponsibleId, submitLabel, onSubmit, onCancel }: DemandFormProps) {
  const { activeProfiles } = useProfiles();
  const [values, setValues] = useState<DemandInput>(() => toInput(initial, defaultResponsibleId));
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const isNew = !initial;

  function set<K extends keyof DemandInput>(key: K, value: DemandInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setTitleError('Informe o título.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        {
          ...values,
          title: values.title.trim(),
          description: values.description?.trim() || null,
          observations: values.observations?.trim() || null,
          completed_at: values.status === 'concluido' ? values.completed_at : null,
        },
        photos,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const dueBeforeOpen = values.due_date && values.due_date < values.opened_on;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="card stack">
        <Field label="Título da demanda *" error={titleError}>
          <input
            className="input"
            value={values.title}
            autoFocus={isNew}
            placeholder="Ex.: Trocar lâmpada do corredor"
            onChange={(e) => {
              set('title', e.target.value);
              setTitleError(null);
            }}
          />
        </Field>
        <Field label="Descrição detalhada">
          <textarea
            className="textarea"
            value={values.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="Status" as="div">
          <StatusPicker value={values.status} onChange={(s) => set('status', s)} />
        </Field>
        <Field label="Prioridade" as="div">
          <PriorityPicker value={values.priority} onChange={(p) => set('priority', p)} />
        </Field>
      </div>

      <div className="card form-grid">
        <Field label="Data de criação">
          <input
            className="input"
            type="date"
            value={values.opened_on}
            onChange={(e) => set('opened_on', e.target.value || todayISO())}
          />
        </Field>
        <Field label="Prazo / data limite" error={dueBeforeOpen ? 'Prazo anterior à data de criação.' : null}>
          <input
            className="input"
            type="date"
            value={values.due_date ?? ''}
            onChange={(e) => set('due_date', e.target.value || null)}
          />
        </Field>
        <Field label="Responsável pela execução">
          <select
            className="select"
            value={values.responsible_id ?? ''}
            onChange={(e) => set('responsible_id', e.target.value || null)}
          >
            <option value="">— Sem responsável —</option>
            {activeProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tempo gasto" as="div">
          <DurationInput value={values.time_spent_minutes} onChange={(m) => set('time_spent_minutes', m)} />
        </Field>
        {values.status === 'concluido' && (
          <Field label="Data de conclusão" hint="Em branco = hoje">
            <input
              className="input"
              type="date"
              value={values.completed_at ? timestampToISODate(values.completed_at) : ''}
              onChange={(e) => set('completed_at', e.target.value ? dateToTimestamp(e.target.value) : null)}
            />
          </Field>
        )}
      </div>

      <div className="card stack">
        <Field label="Observações" hint='Ex.: "Necessário comprar madeira."'>
          <textarea
            className="textarea"
            value={values.observations ?? ''}
            onChange={(e) => set('observations', e.target.value)}
          />
        </Field>
        {isNew && (
          <Field label="Fotos antes" as="div">
            <PendingPhotos files={photos} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
            <PhotoPicker onFiles={(f) => setPhotos((p) => [...p, ...f])} disabled={submitting} />
          </Field>
        )}
      </div>

      <div className="form-actions">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
