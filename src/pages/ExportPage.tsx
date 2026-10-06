import { useEffect, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Info } from 'lucide-react';
import { Button, errorMessage, Field, PageHeader, useToast } from '@/components/ui';
import { store } from '@/data';
import type { OccurrenceRow } from '@/features/export/columns';
import { buildWorkbook, fetchTemplate } from '@/features/export/excel';
import { TEMPLATE_MAPPING } from '@/features/export/templateMapping';
import { downloadBlob } from '@/lib/download';
import { endOfMonthISO, formatDate, startOfMonthISO, todayISO } from '@/lib/date';
import { isClosedStatus, type Demand } from '@/types/domain';

type Scope = 'todas' | 'periodo' | 'concluidas' | 'pendentes' | 'rotinas';

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: 'todas', label: 'Todas as demandas', hint: 'Tudo o que está cadastrado' },
  { value: 'periodo', label: 'Demandas por período', hint: 'Pela data de criação' },
  { value: 'concluidas', label: 'Demandas concluídas', hint: 'Status Concluído' },
  { value: 'pendentes', label: 'Demandas pendentes', hint: 'Em aberto: pendente, em andamento ou aguardando material' },
  { value: 'rotinas', label: 'Rotinas', hint: 'Cadastro e execuções no período' },
];

const byCode = (a: Demand, b: Demand) => a.code - b.code;

export function ExportPage() {
  const toast = useToast();
  const [scope, setScope] = useState<Scope>('todas');
  const [from, setFrom] = useState(startOfMonthISO(todayISO()));
  const [to, setTo] = useState(endOfMonthISO(todayISO()));
  const [exporting, setExporting] = useState(false);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);

  useEffect(() => {
    fetchTemplate().then((t) => setHasTemplate(t !== null));
  }, []);

  const needsPeriod = scope === 'periodo' || scope === 'rotinas';

  async function handleExport() {
    if (needsPeriod && from > to) {
      toast('A data inicial é maior que a final.', 'error');
      return;
    }
    setExporting(true);
    try {
      const [demands, profiles] = await Promise.all([store.listDemands(), store.listProfiles()]);
      const names = new Map(profiles.map((p) => [p.id, p.full_name]));
      const ctx = { nameOf: (id: string | null) => (id ? (names.get(id) ?? '') : '') };
      const period = `${formatDate(from)} a ${formatDate(to)}`;

      let title = '';
      let selected: Demand[] | null = null;
      let routines = null;
      let occurrences: OccurrenceRow[] | null = null;

      switch (scope) {
        case 'todas':
          title = 'Todas as demandas';
          selected = demands;
          break;
        case 'periodo':
          title = `Demandas criadas de ${period}`;
          selected = demands.filter((d) => d.opened_on >= from && d.opened_on <= to);
          break;
        case 'concluidas':
          title = 'Demandas concluídas';
          selected = demands.filter((d) => d.status === 'concluido');
          break;
        case 'pendentes':
          title = 'Demandas pendentes (em aberto)';
          selected = demands.filter((d) => !isClosedStatus(d.status));
          break;
        case 'rotinas': {
          title = `Rotinas — ${period}`;
          routines = await store.listRoutines();
          const byId = new Map(routines.map((r) => [r.id, r]));
          occurrences = (await store.listOccurrences(from, to))
            .filter((o) => byId.has(o.routine_id))
            .map((o) => ({ ...o, routine: byId.get(o.routine_id)! }))
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.routine.name.localeCompare(b.routine.name));
          break;
        }
      }

      const { blob } = await buildWorkbook({
        title,
        demands: selected ? [...selected].sort(byCode) : null,
        routines,
        occurrences,
        ctx,
      });
      downloadBlob(blob, `Planejamento Atividades Manutenção - ${todayISO()}.xlsx`);
      toast('Planilha gerada');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Exportar Excel" subtitle="Gera a planilha de planejamento com os dados do sistema" />
      <div className="stack export-page">
        {hasTemplate !== null && (
          <div className={`alert ${hasTemplate ? 'alert--info' : 'alert--warning'}`}>
            {hasTemplate ? <CheckCircle2 size={18} /> : <Info size={18} />}
            <span>
              {hasTemplate
                ? TEMPLATE_MAPPING
                  ? 'Usando o modelo original da planilha.'
                  : 'Modelo original encontrado: as abas dele são mantidas e os dados entram em abas próprias até o mapeamento das colunas ser configurado.'
                : 'Modelo original ainda não adicionado (public/templates). Será usado o layout padrão.'}
            </span>
          </div>
        )}

        <fieldset className="card stack export-options">
          <legend className="card__title">O que exportar</legend>
          {SCOPES.map((s) => (
            <label key={s.value} className={`radio-card${scope === s.value ? ' radio-card--checked' : ''}`}>
              <input type="radio" name="scope" value={s.value} checked={scope === s.value} onChange={() => setScope(s.value)} />
              <span>
                <strong>{s.label}</strong>
                <span className="text-muted radio-card__hint">{s.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {needsPeriod && (
          <div className="card form-grid">
            <Field label="De">
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Até">
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}

        <Button size="lg" block onClick={handleExport} disabled={exporting}>
          <FileSpreadsheet size={20} /> {exporting ? 'Gerando…' : 'Exportar para Excel'}
        </Button>
      </div>
    </>
  );
}
