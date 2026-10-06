import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Dialog, DurationInput, errorMessage, Field, useToast } from '@/components/ui';
import { store } from '@/data';
import type { Demand } from '@/types/domain';
import { PendingPhotos, PhotoPicker } from './PhotoPicker';
import { uploadPhotos } from './uploadPhotos';

interface CompleteDialogProps {
  demand: Demand;
  open: boolean;
  onClose: () => void;
}

/** Concluir serviço numa ação só: tempo gasto, observação e foto "depois". */
export function CompleteDialog({ demand, open, onClose }: CompleteDialogProps) {
  const toast = useToast();
  const [minutes, setMinutes] = useState(demand.time_spent_minutes);
  const [observations, setObservations] = useState(demand.observations ?? '');
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMinutes(demand.time_spent_minutes);
    setObservations(demand.observations ?? '');
    setPhotos([]);
    // só ao abrir: atualizações em tempo real não apagam o que está sendo digitado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, demand.id]);

  async function handleConfirm() {
    setSaving(true);
    try {
      await store.updateDemand(demand.id, {
        status: 'concluido',
        time_spent_minutes: minutes,
        observations: observations.trim() || null,
      });
      if (photos.length) await uploadPhotos(demand.id, 'depois', photos);
      toast('Serviço concluído');
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
      title="Concluir serviço"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            <CheckCircle2 size={18} /> {saving ? 'Salvando…' : 'Concluir'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Tempo gasto" as="div">
          <DurationInput value={minutes} onChange={setMinutes} />
        </Field>
        <Field label="Observações">
          <textarea className="textarea" value={observations} onChange={(e) => setObservations(e.target.value)} />
        </Field>
        <Field label="Fotos depois (opcional)" as="div">
          <PendingPhotos files={photos} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
          <PhotoPicker onFiles={(f) => setPhotos((p) => [...p, ...f])} disabled={saving} />
        </Field>
      </div>
    </Dialog>
  );
}
