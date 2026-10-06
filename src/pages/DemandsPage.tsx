import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, Search, X } from 'lucide-react';
import { Button, EmptyState, Loading, PageHeader } from '@/components/ui';
import { store } from '@/data';
import { useProfiles, useStoreQuery } from '@/data/hooks';
import { DemandList } from '@/features/demands/DemandList';
import {
  EMPTY_FILTERS,
  filterDemands,
  sortDemands,
  type DemandFilters,
} from '@/features/demands/demandUtils';
import { DEMAND_STATUSES, PRIORITIES, PRIORITY_LABEL, STATUS_LABEL } from '@/types/domain';

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof DemandFilters)[];

export function DemandsPage() {
  const [params, setParams] = useSearchParams();
  const { data: demands, loading } = useStoreQuery(() => store.listDemands(), []);
  const { activeProfiles } = useProfiles();

  // Filtros vivem na URL: dá para compartilhar o link e voltar sem perder
  const filters = useMemo(() => {
    const f = { ...EMPTY_FILTERS };
    for (const key of FILTER_KEYS) (f as Record<string, string>)[key] = params.get(key) ?? '';
    return f;
  }, [params]);

  function setFilter(key: keyof DemandFilters, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);
  const visible = useMemo(() => sortDemands(filterDemands(demands ?? [], filters)), [demands, filters]);

  return (
    <>
      <PageHeader
        title="Demandas"
        subtitle={demands ? `${visible.length} de ${demands.length} demandas` : undefined}
        actions={
          <Link to="/demandas/nova" className="btn btn--primary">
            <Plus size={18} /> Nova demanda
          </Link>
        }
      />

      <div className="filters card">
        <label className="filters__search">
          <Search size={18} aria-hidden />
          <input
            className="input"
            type="search"
            placeholder="Buscar por título, descrição, observação ou nº"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
          />
        </label>
        <div className="filters__row">
          <select
            className="select"
            aria-label="Status"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="abertas">Em aberto</option>
            {DEMAND_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Prioridade"
            value={filters.priority}
            onChange={(e) => setFilter('priority', e.target.value)}
          >
            <option value="">Todas as prioridades</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Prazo"
            value={filters.deadline}
            onChange={(e) => setFilter('deadline', e.target.value)}
          >
            <option value="">Qualquer prazo</option>
            <option value="atrasadas">Atrasadas</option>
            <option value="proximas">Próximas do prazo</option>
            <option value="sem_prazo">Sem prazo</option>
          </select>
          <select
            className="select"
            aria-label="Responsável"
            value={filters.responsible}
            onChange={(e) => setFilter('responsible', e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            <option value="none">Sem responsável</option>
            {activeProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          <label className="filters__date">
            <span>De</span>
            <input className="input" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </label>
          <label className="filters__date">
            <span>Até</span>
            <input className="input" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          </label>
          {hasFilters && (
            <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>
              <X size={16} /> Limpar
            </Button>
          )}
        </div>
      </div>

      {loading && !demands ? (
        <Loading />
      ) : visible.length ? (
        <DemandList demands={visible} />
      ) : (
        <div className="card">
          <EmptyState icon={ClipboardList} title={hasFilters ? 'Nenhuma demanda encontrada' : 'Nenhuma demanda ainda'}>
            {hasFilters ? <p>Ajuste ou limpe os filtros.</p> : <Link to="/demandas/nova">Criar a primeira demanda</Link>}
          </EmptyState>
        </div>
      )}
    </>
  );
}
