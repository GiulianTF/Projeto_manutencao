import { useEffect, useState } from 'react';
import { Button, Dialog, errorMessage, Field, useToast } from '@/components/ui';
import { store } from '@/data';
import { useProfiles } from '@/data/hooks';
import { todayISO } from '@/lib/date';
import { INTERVAL_OPTIONS, WEEKDAY_LABEL, type Routine, type RoutineInput } from '@/types/domain';

interface RoutineFormDialogProps {
  open: boolean;
  routine: Routine | null; // null = nova
  onClose: () => void;
}

const EMPTY: RoutineInput = {
  name: '',
  description: null,
  weekday: 1,
  interval_weeks: 1,
  starts_on: todayISO(),
  responsible_id: null,
  active: true,
};

// Ordem de exibição: segunda a domingo
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function RoutineFormDialog({ open, routine, onClose }: RoutineFormDialogProps) {
  const toast = useToast();
  const { activeProfiles } = useProfiles();
  const [values, setValues] = useState<RoutineInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(
      routine
        ? {
            name: routine.name,
            description: routine.description,
            weekday: routine.weekday,
            interval_weeks: routine.interval_weeks,
            starts_on: routine.starts_on,
            responsible_id: routine.responsible_id,
            active: routine.active,
          }
        : { ...EMPTY, starts_on: todayISO() },
    );
  }, [open, routine]);

  function set<K extends keyof RoutineInput>(key: K, value: RoutineInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    if (!values.name.trim()) {
      setError('Informe o nome.');
      return;
    }
    setSaving(true);
    const input = { ...values, name: values.name.trim(), description: values.description?.trim() || null };
    try {
      if (routine) await store.updateRoutine(routine.id, input);
      else await store.createRoutine(input);
      toast(routine ? 'Rotina atualizada' : 'Rotina criada');
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={routine ? 'Editar rotina' : 'Nova rotina'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Nome *" error={error}>
          <input
            className="input"
            value={values.name}
            placeholder="Ex.: Verificar iluminação"
            onChange={(e) => {
              set('name', e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="Descrição">
          <textarea
            className="textarea"
            value={values.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Dia da semana">
            <select className="select" value={values.weekday} onChange={(e) => set('weekday', Number(e.target.value))}>
              {WEEKDAY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABEL[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Periodicidade">
            <select
              className="select"
              value={values.interval_weeks}
              onChange={(e) => set('interval_weeks', Number(e.target.value))}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsável">
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
          <Field label="Começa em" hint="Base para contar a periodicidade">
            <input
              className="input"
              type="date"
              value={values.starts_on}
              onChange={(e) => set('starts_on', e.target.value || todayISO())}
            />
          </Field>
        </div>
        <label className="switch">
          <input type="checkbox" checked={values.active} onChange={(e) => set('active', e.target.checked)} />
          <span>Rotina ativa</span>
        </label>
      </div>
    </Dialog>
  );
}
