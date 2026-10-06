import { store } from '@/data';
import { compressImage } from '@/lib/image';
import type { PhotoKind } from '@/types/domain';

/** Comprime e envia as fotos em sequência (poupa memória e banda no celular). */
export async function uploadPhotos(demandId: string, kind: PhotoKind, files: File[]) {
  for (const file of files) {
    const blob = await compressImage(file);
    await store.addPhoto(demandId, kind, blob);
  }
}
