import { useEffect, useState } from 'react';
import { ImageOff, Trash2 } from 'lucide-react';
import { Button, Dialog, errorMessage, useToast } from '@/components/ui';
import { store } from '@/data';
import { formatDateTime } from '@/lib/date';
import type { DemandPhoto, PhotoKind } from '@/types/domain';
import { PhotoPicker } from './PhotoPicker';
import { uploadPhotos } from './uploadPhotos';

function usePhotoUrl(photo: DemandPhoto | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (photo) store.photoUrl(photo).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [photo]);
  return url;
}

function PhotoThumb({ photo, onOpen }: { photo: DemandPhoto; onOpen: () => void }) {
  const url = usePhotoUrl(photo);
  return (
    <button type="button" className="photo-thumb" onClick={onOpen} aria-label="Ampliar foto">
      {url ? <img src={url} alt="" loading="lazy" /> : <ImageOff size={20} />}
    </button>
  );
}

interface PhotoSectionProps {
  demandId: string;
  kind: PhotoKind;
  photos: DemandPhoto[];
}

export function PhotoSection({ demandId, kind, photos }: PhotoSectionProps) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<DemandPhoto | null>(null);
  const viewingUrl = usePhotoUrl(viewing);
  const title = kind === 'antes' ? 'Antes' : 'Depois';

  async function handleFiles(files: File[]) {
    setUploading(true);
    try {
      await uploadPhotos(demandId, kind, files);
      toast(files.length > 1 ? `${files.length} fotos adicionadas` : 'Foto adicionada');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!viewing || !confirm('Remover esta foto?')) return;
    try {
      await store.removePhoto(viewing);
      setViewing(null);
      toast('Foto removida');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <section className="photo-section">
      <h3 className="photo-section__title">
        {title} <span className="text-muted">({photos.length})</span>
      </h3>
      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((p) => (
            <PhotoThumb key={p.id} photo={p} onOpen={() => setViewing(p)} />
          ))}
        </div>
      ) : (
        <p className="text-muted photo-section__empty">Nenhuma foto.</p>
      )}
      <PhotoPicker onFiles={handleFiles} disabled={uploading} />
      {uploading && <p className="field__hint">Enviando…</p>}

      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={`Foto ${title.toLowerCase()}`}
        size="lg"
        footer={
          <>
            <span className="text-muted dialog__meta">{viewing && formatDateTime(viewing.created_at)}</span>
            <Button variant="danger" onClick={handleRemove}>
              <Trash2 size={16} /> Remover
            </Button>
          </>
        }
      >
        {viewingUrl && <img className="photo-viewer" src={viewingUrl} alt={`Foto ${title.toLowerCase()}`} />}
      </Dialog>
    </section>
  );
}
