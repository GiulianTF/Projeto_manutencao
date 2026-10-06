// Geração do .xlsx no navegador com ExcelJS (carregado sob demanda).

import type { Borders, Cell, Fill, Row, Workbook, Worksheet } from 'exceljs';
import type { Demand, DemandStatus, Routine } from '@/types/domain';
import { DEMAND_STATUSES, STATUS_LABEL } from '@/types/domain';
import {
  demandColumns,
  DURATION_FMT,
  occurrenceColumns,
  routineColumns,
  type ColumnDef,
  type ExportContext,
  type OccurrenceRow,
} from './columns';
import { TEMPLATE_MAPPING, TEMPLATE_URL, type TemplateMapping } from './templateMapping';

type ExcelModule = typeof import('exceljs');

async function loadExcelJS(): Promise<ExcelModule> {
  const mod = await import('exceljs');
  return (mod as unknown as { default?: ExcelModule }).default ?? mod;
}

export interface ExportPayload {
  title: string; // descrição do recorte, ex.: "Demandas concluídas"
  demands: Demand[] | null; // null = não exportar demandas
  routines: Routine[] | null;
  occurrences: OccurrenceRow[] | null;
  ctx: ExportContext;
}

export interface ExportResult {
  blob: Blob;
  usedTemplate: boolean;
}

// ---------- Paleta (cores do design system, em ARGB) ----------
const C = {
  title: 'FF1F5FBF',
  header: 'FF194F9F',
  white: 'FFFFFFFF',
  zebra: 'FFF4F6F9',
  border: 'FFC5CCD8',
  danger: 'FFC62828',
  muted: 'FF5D6878',
};

const STATUS_FILL: Record<DemandStatus, string> = {
  pendente: 'FFFFF1D6',
  em_andamento: 'FFE1ECFF',
  aguardando_material: 'FFEFE6FF',
  concluido: 'FFDCF5E6',
  cancelado: 'FFECEEF1',
};

const thin = { style: 'thin' as const, color: { argb: C.border } };
const BORDER: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin };
const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

/** Busca o modelo; o dev server devolve index.html para arquivo inexistente, então checa a assinatura ZIP. */
export async function fetchTemplate(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const sig = new Uint8Array(buf, 0, 2);
    return sig[0] === 0x50 && sig[1] === 0x4b ? buf : null; // "PK"
  } catch {
    return null;
  }
}

export async function buildWorkbook(payload: ExportPayload): Promise<ExportResult> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestão de Manutenção';
  wb.created = new Date();

  const template = await fetchTemplate();
  let usedTemplate = false;

  if (template) {
    await wb.xlsx.load(template);
    usedTemplate = true;
    if (TEMPLATE_MAPPING && payload.demands) {
      fillTemplate(wb, TEMPLATE_MAPPING, payload);
      addRoutineSheets(wb, payload);
    } else {
      // Sem mapeamento ainda: preserva o modelo e acrescenta as abas do sistema
      addSystemSheets(wb, payload);
    }
  } else {
    addSystemSheets(wb, payload);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    usedTemplate,
  };
}

// ---------- Layout padrão ----------

function addSystemSheets(wb: Workbook, p: ExportPayload) {
  if (p.demands) {
    const columns = demandColumns(p.ctx);
    addTableSheet(wb, uniqueName(wb, 'Demandas'), 'PLANEJAMENTO DE ATIVIDADES DE MANUTENÇÃO', p.title, columns, p.demands, {
      decorate: decorateDemandRow,
    });
    addSummarySheet(wb, p.demands, columns);
  }
  addRoutineSheets(wb, p);
}

function addRoutineSheets(wb: Workbook, p: ExportPayload) {
  if (p.routines) {
    addTableSheet(wb, uniqueName(wb, 'Rotinas'), 'ROTINAS DE MANUTENÇÃO PREVENTIVA', 'Cadastro de rotinas', routineColumns(p.ctx), p.routines);
  }
  if (p.occurrences) {
    addTableSheet(wb, uniqueName(wb, 'Ocorrências'), 'EXECUÇÃO DAS ROTINAS', p.title, occurrenceColumns(p.ctx), p.occurrences);
  }
}

function uniqueName(wb: Workbook, base: string): string {
  let name = base;
  for (let i = 2; wb.getWorksheet(name); i++) name = `${base} (${i})`;
  return name;
}

const HEADER_ROW = 4;

function addTableSheet<T>(
  wb: Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: ColumnDef<T>[],
  rows: T[],
  opts: { decorate?: (row: Row, item: T, columns: ColumnDef<T>[]) => void } = {},
): Worksheet {
  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const lastCol = columns.length;

  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  // Título e subtítulo
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: C.white } };
  titleCell.fill = solid(C.title);
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, lastCol);
  const sub = ws.getCell(2, 1);
  sub.value = `${subtitle} · gerado em ${new Date().toLocaleString('pt-BR')}`;
  sub.font = { italic: true, color: { argb: C.muted } };
  sub.alignment = { horizontal: 'center' };

  // Cabeçalho
  const header = ws.getRow(HEADER_ROW);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: C.white } };
    cell.fill = solid(C.header);
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  header.height = 22;

  // Dados
  rows.forEach((item, idx) => {
    const row = ws.getRow(HEADER_ROW + 1 + idx);
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = c.value(item);
      cell.border = BORDER;
      cell.alignment = { vertical: 'top', wrapText: c.wrap };
      if (c.numFmt) cell.numFmt = c.numFmt;
      if (idx % 2 === 1) cell.fill = solid(C.zebra);
    });
    opts.decorate?.(row, item, columns);
  });

  const lastDataRow = HEADER_ROW + rows.length;
  if (rows.length) {
    ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: lastDataRow, column: lastCol } };
    addTotalsRow(ws, columns, lastDataRow);
  }
  return ws;
}

/** Linha de totais com fórmulas (quantidade e soma do tempo). */
function addTotalsRow<T>(ws: Worksheet, columns: ColumnDef<T>[], lastDataRow: number) {
  const row = ws.getRow(lastDataRow + 1);
  const first = HEADER_ROW + 1;
  const firstCell = row.getCell(1);
  firstCell.value = 'Total';
  columns.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.font = { bold: true };
    cell.border = { top: { style: 'medium', color: { argb: C.header } } };
    if (c.numFmt === DURATION_FMT) {
      const col = ws.getColumn(i + 1).letter;
      cell.value = { formula: `SUM(${col}${first}:${col}${lastDataRow})` };
      cell.numFmt = DURATION_FMT;
    }
  });
  row.getCell(2).value = `${lastDataRow - first + 1} registro(s)`;
}

function decorateDemandRow(row: Row, d: Demand, columns: ColumnDef<Demand>[]) {
  const cellOf = (key: string): Cell => row.getCell(columns.findIndex((c) => c.key === key) + 1);
  cellOf('status').fill = solid(STATUS_FILL[d.status]);
  const situation = cellOf('situation');
  if (situation.value === 'Atrasada') {
    situation.font = { bold: true, color: { argb: C.danger } };
    cellOf('due_date').font = { bold: true, color: { argb: C.danger } };
  }
}

/** Aba Resumo: contagens por status com CONT.SE apontando para a aba Demandas. */
function addSummarySheet(wb: Workbook, demands: Demand[], columns: ColumnDef<Demand>[]) {
  const ws = wb.addWorksheet(uniqueName(wb, 'Resumo'));
  ws.columns = [{ width: 26 }, { width: 14 }];
  const demandSheet = wb.worksheets.find((s) => s.name.startsWith('Demandas'))?.name ?? 'Demandas';
  const first = HEADER_ROW + 1;
  const last = HEADER_ROW + Math.max(demands.length, 1);
  const range = (key: string) => {
    const letter = ws.getColumn(columns.findIndex((c) => c.key === key) + 1).letter;
    return `'${demandSheet}'!${letter}${first}:${letter}${last}`;
  };
  const statusCol = range('status');
  const situationCol = range('situation');
  const timeCol = range('time_spent');

  ws.mergeCells('A1:B1');
  const title = ws.getCell('A1');
  title.value = 'RESUMO';
  title.font = { bold: true, size: 14, color: { argb: C.white } };
  title.fill = solid(C.title);
  title.alignment = { horizontal: 'center' };

  const rows: [string, { formula: string }, string?][] = [
    ['Total de demandas', { formula: `COUNTA(${statusCol})` }],
    ...DEMAND_STATUSES.map((s): [string, { formula: string }] => [STATUS_LABEL[s], { formula: `COUNTIF(${statusCol},"${STATUS_LABEL[s]}")` }]),
    ['Atrasadas', { formula: `COUNTIF(${situationCol},"Atrasada")` }],
    ['Tempo total gasto', { formula: `SUM(${timeCol})` }, DURATION_FMT],
  ];
  rows.forEach(([label, formula, fmt], i) => {
    const r = ws.getRow(3 + i);
    r.getCell(1).value = label;
    r.getCell(1).border = BORDER;
    const v = r.getCell(2);
    v.value = formula;
    v.border = BORDER;
    v.alignment = { horizontal: 'right' };
    if (fmt) v.numFmt = fmt;
  });
}

// ---------- Preenchimento do modelo original ----------

function fillTemplate(wb: Workbook, m: TemplateMapping, p: ExportPayload) {
  const ws = wb.getWorksheet(m.sheet);
  if (!ws || !p.demands) {
    addSystemSheets(wb, p);
    return;
  }
  const columns = demandColumns(p.ctx);
  const styleRow = ws.getRow(m.firstDataRow);
  const mappedKeys = new Set(Object.keys(m.columns));

  // Colunas que o modelo não tem entram à direita do bloco original
  const lastTemplateCol = Math.max(...Object.values(m.columns).map((l) => ws.getColumn(l).number));
  const extras = columns.filter((c) => !mappedKeys.has(c.key));
  const headerRow = ws.getRow(m.headerRow);
  const headerStyle = headerRow.getCell(lastTemplateCol).style;
  extras.forEach((c, i) => {
    const colNumber = lastTemplateCol + 1 + i;
    ws.getColumn(colNumber).width = c.width;
    const cell = headerRow.getCell(colNumber);
    cell.value = c.header;
    cell.style = structuredClone(headerStyle);
  });

  const target = [
    ...columns.filter((c) => mappedKeys.has(c.key)).map((c) => ({ c, col: ws.getColumn(m.columns[c.key]).number })),
    ...extras.map((c, i) => ({ c, col: lastTemplateCol + 1 + i })),
  ];
  const baseStyle = new Map(target.map(({ col }) => [col, structuredClone(styleRow.getCell(Math.min(col, lastTemplateCol)).style)]));

  p.demands.forEach((d, idx) => {
    const row = ws.getRow(m.firstDataRow + idx);
    for (const { c, col } of target) {
      const cell = row.getCell(col);
      cell.style = structuredClone(baseStyle.get(col)!);
      cell.value = c.value(d);
      if (c.numFmt) cell.numFmt = c.numFmt;
    }
  });

  for (const [addr, kind] of Object.entries(m.headerCells ?? {})) {
    ws.getCell(addr).value = kind === 'period' ? p.title : new Date();
  }
}
