import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Pencil, SearchX, Trash2 } from 'lucide-react';
import {
  Button,
  DueSoonBadge,
  DurationInput,
  EmptyState,
  errorMessage,
  Loading,
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
  StatusPicker,
  useToast,
} from '@/components/ui';
import { store } from '@/data';
import { useProfiles, useStoreQuery } from '@/data/hooks';
import { CompleteDialog } from '@/features/demands/CompleteDialog';
import { deadlineState } from '@/features/demands/demandUtils';
import { HistoryTimeline } from '@/features/demands/HistoryTimeline';
import { PhotoSection } from '@/features/demands/PhotoSection';
import { formatDate, formatTimestampDate } from '@/lib/date';
import type { DemandInput, DemandStatus } from '@/types/domain';

export function DemandDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { nameOf } = useProfiles();
  const { data: demand, loading } = useStoreQuery(() => store.getDemand(id), [id]);
  const { data: photos = [] } = useStoreQuery(() => store.listPhotos(id), [id]);
  const [completing, setCompleting] = useState(false);
  const [observations, setObservations] = useState('');

  // Sincroniza o rascunho das observações quando a demanda muda (inclusive por outro usuário)
  useEffect(() => setObservations(demand?.observations ?? ''), [demand?.observations]);

  if (loading && demand === undefined) return <Loading />;
  if (!demand) {
    return (
      <EmptyState icon={SearchX} title="Demanda não encontrada">
        <Link to="/demandas">Voltar para a lista</Link>
      </EmptyState>
    );
  }

  const deadline = deadlineState(demand);
  const observationsDirty = observations !== (demand.observations ?? '');

  async function save(patch: Partial<DemandInput>, message?: string) {
    try {
      await store.updateDemand(id, patch);
      if (message) toast(message);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  function handleStatus(status: DemandStatus) {
    if (status === 'concluido') setCompleting(true);
    else save({ status }, 'Status atualizado');
  }

  async function handleDelete() {
    if (!demand || !confirm(`Excluir a demanda #${demand.code}? Esta ação não pode ser desfeita.`)) return;
    try {
      await store.deleteDemand(id);
      toast('Demanda excluída');
      navigate('/demandas', { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <div className="detail-header">
        <Link to="/demandas" className="btn btn--ghost detail-header__back">
          <ArrowLeft size={18} /> Demandas
        </Link>
        <div className="detail-header__main">
          <p className="detail-header__code">Demanda #{demand.code}</p>
          <h1 className="page-header__title">{demand.title}</h1>
          <div className="row detail-header__badges">
            <StatusBadge status={demand.status} />
            <PriorityBadge priority={demand.priority} />
            {deadline === 'overdue' && <OverdueBadge />}
            {deadline === 'soon' && <DueSoonBadge />}
          </div>
        </div>
        <div className="row">
          <Link to={`/demandas/${id}/editar`} className="btn btn--secondary">
            <Pencil size={16} /> Editar
          </Link>
          <Button variant="ghost" onClick={handleDelete} aria-label="Excluir demanda">
            <Trash2 size={16} /> Excluir
          </Button>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <section className="card stack">
            <h2 className="card__title">Status</h2>
            <StatusPicker value={demand.status} onChange={handleStatus} />
            {demand.status !== 'concluido' && demand.status !== 'cancelado' && (
              <Button size="lg" block onClick={() => setCompleting(true)}>
                <CheckCircle2 size={20} /> Concluir serviço
              </Button>
            )}
          </section>

          <section className="card stack">
            <h2 className="card__title">Observações</h2>
            <textarea
              className="textarea"
              value={observations}
              placeholder="Ex.: Executar no sábado sem chuva."
              onChange={(e) => setObservations(e.target.value)}
            />
            {observationsDirty && (
              <div className="row">
                <Button onClick={() => save({ observations: observations.trim() || null }, 'Observações salvas')}>
                  Salvar observações
                </Button>
                <Button variant="ghost" onClick={() => setObservations(demand.observations ?? '')}>
                  Descartar
                </Button>
              </div>
            )}
          </section>

          <section className="card stack">
            <h2 className="card__title">Fotos</h2>
            <div className="photo-columns">
              <PhotoSection demandId={id} kind="antes" photos={photos.filter((p) => p.kind === 'antes')} />
              <PhotoSection demandId={id} kind="depois" photos={photos.filter((p) => p.kind === 'depois')} />
            </div>
          </section>
        </div>

        <aside className="detail-layout__side">
          <section className="card">
            <h2 className="card__title">Detalhes</h2>
            <dl className="info-list">
              <dt>Descrição</dt>
              <dd className="info-list__text">{demand.description || '—'}</dd>
              <dt>Responsável</dt>
              <dd>{nameOf(demand.responsible_id)}</dd>
              <dt>Data de criação</dt>
              <dd>{formatDate(demand.opened_on)}</dd>
              <dt>Prazo</dt>
              <dd className={deadline === 'overdue' ? 'text-danger' : undefined}>{formatDate(demand.due_date)}</dd>
              <dt>Conclusão</dt>
              <dd>{formatTimestampDate(demand.completed_at)}</dd>
              <dt>Criada por</dt>
              <dd>{nameOf(demand.created_by)}</dd>
            </dl>
          </section>

          <section className="card stack">
            <h2 className="card__title">Tempo gasto</h2>
            <DurationInput
              value={demand.time_spent_minutes}
              onChange={(m) => m !== demand.time_spent_minutes && save({ time_spent_minutes: m }, 'Tempo atualizado')}
            />
          </section>

          <section className="card">
            <h2 className="card__title">Histórico</h2>
            <HistoryTimeline demandId={id} />
          </section>
        </aside>
      </div>

      <CompleteDialog demand={demand} open={completing} onClose={() => setCompleting(false)} />
    </>
  );
}
