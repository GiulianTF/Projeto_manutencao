import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, errorMessage, Loading, PageHeader, useToast } from '@/components/ui';
import { store } from '@/data';
import { useCurrentUserId, useStoreQuery } from '@/data/hooks';
import { DemandForm } from '@/features/demands/DemandForm';
import { uploadPhotos } from '@/features/demands/uploadPhotos';
import type { DemandInput } from '@/types/domain';
import { SearchX } from 'lucide-react';

export function NewDemandPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const currentUserId = useCurrentUserId();

  async function handleSubmit(input: DemandInput, photos: File[]) {
    try {
      const demand = await store.createDemand(input);
      if (photos.length) {
        try {
          await uploadPhotos(demand.id, 'antes', photos);
        } catch (e) {
          toast(`Demanda salva, mas houve erro nas fotos: ${errorMessage(e)}`, 'error');
        }
      }
      toast(`Demanda #${demand.code} criada`);
      navigate(`/demandas/${demand.id}`, { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageHeader title="Nova demanda" subtitle="Problema ou serviço que precisa ser resolvido" />
      {/* key: espera o usuário atual para sugerir como responsável */}
      <DemandForm
        key={currentUserId ?? 'anon'}
        defaultResponsibleId={currentUserId}
        submitLabel="Criar demanda"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}

export function EditDemandPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: demand, loading } = useStoreQuery(() => store.getDemand(id), [id]);

  if (loading && demand === undefined) return <Loading />;
  if (!demand) {
    return <EmptyState icon={SearchX} title="Demanda não encontrada" />;
  }

  async function handleSubmit(input: DemandInput) {
    try {
      await store.updateDemand(id, input);
      toast('Alterações salvas');
      navigate(`/demandas/${id}`, { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageHeader title={`Editar demanda #${demand.code}`} />
      <DemandForm
        key={demand.id}
        initial={demand}
        submitLabel="Salvar alterações"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}
