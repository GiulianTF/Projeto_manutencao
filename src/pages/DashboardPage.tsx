import { useEffect, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { EmptyState, Loading, PageHeader, StatCard } from '@/components/ui';
import { store } from '@/data';
import { useStoreQuery } from '@/data/hooks';
import { DemandList } from '@/features/demands/DemandList';
import { countByStatus, deadlineState, sortDemands } from '@/features/demands/demandUtils';
import { TodayRoutines } from '@/features/routines/TodayRoutines';
import { addDays, startOfWeekISO, todayISO } from '@/lib/date';
import { isClosedStatus } from '@/types/domain';

const PANEL_LIMIT = 6;

export function DashboardPage() {
  const { data: demands, loading } = useStoreQuery(() => store.listDemands(), []);

  // Garante as ocorrências de rotina da semana atual e da próxima
  useEffect(() => {
    store.generateOccurrences(startOfWeekISO(todayISO()), addDays(todayISO(), 14)).catch(() => undefined);
  }, []);

  const view = useMemo(() => {
    const list = demands ?? [];
    const sorted = sortDemands(list);
    return {
      counts: countByStatus(list),
      total: list.length,
      overdue: sorted.filter((d) => deadlineState(d) === 'overdue'),
      soon: sorted.filter((d) => deadlineState(d) === 'soon'),
      open: sorted.filter((d) => !isClosedStatus(d.status)),
    };
  }, [demands]);

  if (loading && !demands) return <Loading />;

  const stats = [
    { label: 'Total', value: view.total, accent: 'var(--color-primary)', to: '/demandas' },
    { label: 'Pendentes', value: view.counts.pendente, accent: 'var(--status-pendente-dot)', to: '/demandas?status=pendente' },
    { label: 'Em andamento', value: view.counts.em_andamento, accent: 'var(--status-em_andamento-dot)', to: '/demandas?status=em_andamento' },
    { label: 'Aguardando material', value: view.counts.aguardando_material, accent: 'var(--status-aguardando_material-dot)', to: '/demandas?status=aguardando_material' },
    { label: 'Concluídas', value: view.counts.concluido, accent: 'var(--status-concluido-dot)', to: '/demandas?status=concluido' },
    { label: 'Canceladas', value: view.counts.cancelado, accent: 'var(--status-cancelado-dot)', to: '/demandas?status=cancelado' },
    { label: 'Atrasadas', value: view.overdue.length, accent: 'var(--color-danger)', to: '/demandas?deadline=atrasadas' },
    { label: 'Próximas do prazo', value: view.soon.length, accent: 'var(--color-warning)', to: '/demandas?deadline=proximas' },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das demandas de manutenção"
        actions={
          <Link to="/demandas/nova" className="btn btn--primary">
            <Plus size={18} /> Nova demanda
          </Link>
        }
      />
      <div className="stack">
        <section className="stat-grid" aria-label="Indicadores">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </section>

        {view.total === 0 ? (
          <section className="card">
            <EmptyState icon={ClipboardList} title="Nenhuma demanda ainda">
              <Link to="/demandas/nova">Criar a primeira demanda</Link>
            </EmptyState>
          </section>
        ) : (
          <div className="dashboard-grid">
            {view.overdue.length > 0 && (
              <DashboardPanel title="Atrasadas" count={view.overdue.length} to="/demandas?deadline=atrasadas" tone="danger">
                <DemandList demands={view.overdue.slice(0, PANEL_LIMIT)} compact />
              </DashboardPanel>
            )}
            {view.soon.length > 0 && (
              <DashboardPanel title="Próximas do prazo" count={view.soon.length} to="/demandas?deadline=proximas">
                <DemandList demands={view.soon.slice(0, PANEL_LIMIT)} compact />
              </DashboardPanel>
            )}
            <DashboardPanel title="Em aberto" count={view.open.length} to="/demandas?status=abertas">
              {view.open.length ? (
                <DemandList demands={view.open.slice(0, PANEL_LIMIT)} compact />
              ) : (
                <p className="text-muted">Nenhuma demanda em aberto. 🎉</p>
              )}
            </DashboardPanel>
          </div>
        )}

        <TodayRoutines />
      </div>
    </>
  );
}

function DashboardPanel(props: {
  title: string;
  count: number;
  to: string;
  tone?: 'danger';
  children: ReactNode;
}) {
  return (
    <section className={`card panel${props.tone ? ` panel--${props.tone}` : ''}`}>
      <header className="panel__header">
        <h2 className="card__title">
          {props.title} <span className="text-muted">({props.count})</span>
        </h2>
        <Link to={props.to}>Ver todas</Link>
      </header>
      {props.children}
    </section>
  );
}
