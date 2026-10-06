import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';

interface PhotoPickerProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

/** Dois botões: câmera (abre direto no celular) e galeria/arquivo. */
export function PhotoPicker({ onFiles, disabled }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) onFiles(files);
  }

  return (
    <div className="row">
      <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <Camera size={18} /> Tirar foto
      </button>
      <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => galleryRef.current?.click()}>
        <ImagePlus size={18} /> Galeria
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={handle} />
    </div>
  );
}

/** Pré-visualização de fotos escolhidas que ainda não foram enviadas. */
export function PendingPhotos({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  if (!files.length) return null;
  return (
    <div className="photo-grid">
      {urls.map((url, i) => (
        <div key={url} className="photo-thumb">
          <img src={url} alt={`Foto ${i + 1}`} />
          <button type="button" className="photo-thumb__remove" onClick={() => onRemove(i)} aria-label="Remover foto">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
