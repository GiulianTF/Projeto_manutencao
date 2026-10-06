import { useMemo, useState } from 'react';
import { Field, Loading, PageHeader, StatCard } from '@/components/ui';
import { BarList } from '@/components/ui/BarList';
import { store } from '@/data';
import { useProfiles, useStoreQuery } from '@/data/hooks';
import { deadlineState } from '@/features/demands/demandUtils';
import {
  addDays,
  addMonths,
  endOfMonthISO,
  formatMonthYear,
  startOfMonthISO,
  timestampToISODate,
  todayISO,
} from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import { DEMAND_STATUSES, STATUS_LABEL } from '@/types/domain';

type Preset = 'este_mes' | 'mes_passado' | '30d' | '90d' | 'ano' | 'tudo' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'este_mes', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ano', label: 'Este ano' },
  { value: 'tudo', label: 'Todo o período' },
  { value: 'custom', label: 'Personalizado' },
];

function presetRange(p: Preset): [string, string] {
  const today = todayISO();
  switch (p) {
    case 'este_mes':
      return [startOfMonthISO(today), endOfMonthISO(today)];
    case 'mes_passado': {
      const start = addMonths(today, -1);
      return [start, endOfMonthISO(start)];
    }
    case '30d':
      return [addDays(today, -29), today];
    case '90d':
      return [addDays(today, -89), today];
    case 'ano':
      return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
    default:
      return ['0000-01-01', '9999-12-31'];
  }
}

const STATUS_COLOR = {
  pendente: 'var(--status-pendente-dot)',
  em_andamento: 'var(--status-em_andamento-dot)',
  aguardando_material: 'var(--status-aguardando_material-dot)',
  concluido: 'var(--status-concluido-dot)',
  cancelado: 'var(--status-cancelado-dot)',
};

export function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('este_mes');
  const [custom, setCustom] = useState<[string, string]>(presetRange('este_mes'));
  const [from, to] = preset === 'custom' ? custom : presetRange(preset);

  const { data: demands, loading } = useStoreQuery(() => store.listDemands(), []);
  const { data: occurrences = [] } = useStoreQuery(() => store.listOccurrences(from, to), [from, to]);
  const { profiles, nameOf } = useProfiles();

  const r = useMemo(() => {
    const all = demands ?? [];
    const opened = all.filter((d) => d.opened_on >= from && d.opened_on <= to);
    const done = all.filter((d) => {
      if (d.status !== 'concluido' || !d.completed_at) return false;
      const day = timestampToISODate(d.completed_at);
      return day >= from && day <= to;
    });
    const totalMinutes = done.reduce((s, d) => s + d.time_spent_minutes, 0);

    // Realizados por mês (até 12 meses mais recentes do período)
    const byMonth = new Map<string, number>();
    for (const d of done) {
      const m = timestampToISODate(d.completed_at!).slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    }
    const months = [...byMonth.keys()].sort().slice(-12);

    const byResponsible = new Map<string, { count: number; minutes: number }>();
    for (const d of done) {
      const key = d.responsible_id ?? 'none';
      const cur = byResponsible.get(key) ?? { count: 0, minutes: 0 };
      byResponsible.set(key, { count: cur.count + 1, minutes: cur.minutes + d.time_spent_minutes });
    }

    return {
      opened,
      done,
      totalMinutes,
      avgMinutes: done.length ? Math.round(totalMinutes / done.length) : 0,
      canceled: opened.filter((d) => d.status === 'cancelado').length,
      waiting: all.filter((d) => d.status === 'aguardando_material').length,
      overdue: all.filter((d) => deadlineState(d) === 'overdue').length,
      byStatus: DEMAND_STATUSES.map((s) => ({
        key: s,
        label: STATUS_LABEL[s],
        value: opened.filter((d) => d.status === s).length,
        color: STATUS_COLOR[s],
      })),
      byMonth: months.map((m) => ({ key: m, label: formatMonthYear(`${m}-01`), value: byMonth.get(m)! })),
      byResponsible: [...byResponsible.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, v]) => ({
          key: id,
          label: id === 'none' ? 'Sem responsável' : nameOf(id),
          value: v.count,
          display: `${v.count} · ${formatMinutes(v.minutes)}`,
        })),
    };
    // nameOf muda junto com profiles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demands, from, to, profiles]);

  const routineStats = {
    total: occurrences.length,
    done: occurrences.filter((o) => o.status === 'concluida').length,
    skipped: occurrences.filter((o) => o.status === 'nao_realizada').length,
    minutes: occurrences.reduce((s, o) => s + o.time_spent_minutes, 0),
  };

  if (loading && !demands) return <Loading />;

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Indicadores do período" />

      <div className="card filters__row report-period">
        <Field label="Período">
          <select className="select" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {preset === 'custom' && (
          <>
            <Field label="De">
              <input className="input" type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
            </Field>
            <Field label="Até">
              <input className="input" type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} />
            </Field>
          </>
        )}
      </div>

      <div className="stack">
        <section className="stat-grid" aria-label="Indicadores do período">
          <StatCard label="Serviços realizados" value={r.done.length} accent="var(--status-concluido-dot)" />
          <StatCard label="Demandas criadas" value={r.opened.length} accent="var(--color-primary)" />
          <StatCard label="Tempo total gasto" value={formatMinutes(r.totalMinutes)} />
          <StatCard label="Tempo médio por demanda" value={formatMinutes(r.avgMinutes)} />
          <StatCard label="Canceladas" value={r.canceled} accent="var(--status-cancelado-dot)" />
          <StatCard label="Aguardando material (hoje)" value={r.waiting} accent="var(--status-aguardando_material-dot)" to="/demandas?status=aguardando_material" />
          <StatCard label="Atrasadas (hoje)" value={r.overdue} accent="var(--color-danger)" to="/demandas?deadline=atrasadas" />
        </section>

        <div className="report-grid">
          <section className="card">
            <h2 className="card__title">Demandas criadas no período, por status</h2>
            {r.opened.length ? <BarList label="Quantidade por status" items={r.byStatus} /> : <p className="text-muted">Nenhuma demanda no período.</p>}
          </section>

          <section className="card">
            <h2 className="card__title">Serviços realizados por mês</h2>
            {r.byMonth.length ? <BarList label="Realizados por mês" items={r.byMonth} /> : <p className="text-muted">Nenhum serviço concluído no período.</p>}
          </section>

          <section className="card">
            <h2 className="card__title">Realizados por responsável</h2>
            {r.byResponsible.length ? (
              <BarList label="Realizados por responsável" items={r.byResponsible} />
            ) : (
              <p className="text-muted">Nenhum serviço concluído no período.</p>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Rotinas no período</h2>
            {routineStats.total ? (
              <>
                <BarList
                  label="Execução das rotinas"
                  items={[
                    { key: 'done', label: 'Feitas', value: routineStats.done, color: 'var(--status-concluido-dot)' },
                    { key: 'skip', label: 'Não realizadas', value: routineStats.skipped, color: 'var(--color-danger)' },
                    {
                      key: 'pend',
                      label: 'Pendentes',
                      value: routineStats.total - routineStats.done - routineStats.skipped,
                      color: 'var(--status-pendente-dot)',
                    },
                  ]}
                />
                <p className="text-muted report-note">
                  {Math.round((routineStats.done / routineStats.total) * 100)}% de execução · {formatMinutes(routineStats.minutes)} gastos
                </p>
              </>
            ) : (
              <p className="text-muted">Nenhuma ocorrência de rotina no período.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
