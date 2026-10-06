// Mapeamento do modelo "Planejamento Atividades Manutenção-1.xlsx".
//
// ⚠️ PENDENTE: preencher após a análise da planilha original. Enquanto for
// `null`, a exportação gera o layout padrão; se o modelo existir em
// public/templates, as abas dele são mantidas intactas e as abas do sistema
// são acrescentadas ao mesmo arquivo.

export const TEMPLATE_URL = '/templates/planejamento-manutencao.xlsx';

export interface TemplateMapping {
  /** nome da aba onde as demandas são lançadas */
  sheet: string;
  /** linha do cabeçalho (1-based) — usada para estilizar colunas extras */
  headerRow: number;
  /** primeira linha de dados; o estilo dela é copiado para as linhas novas */
  firstDataRow: number;
  /** chave da coluna (ver columns.ts) -> letra da coluna no modelo */
  columns: Record<string, string>;
  /** células fixas a preencher, ex.: { 'B2': 'period' } */
  headerCells?: Record<string, 'period' | 'generatedAt'>;
}

export const TEMPLATE_MAPPING: TemplateMapping | null = null;
