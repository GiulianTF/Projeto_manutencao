const DAY_MS = 24 * 60 * 60 * 1000;

/** Quantos dias antes do prazo uma demanda é considerada "próxima do prazo". */
export const DUE_SOON_DAYS = 3;

/** Date -> "2026-10-05" no fuso local */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** "2026-10-05" (ou timestamp ISO) -> Date local à meia-noite, sem deslocamento de fuso */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDateOnly(toIso).getTime() - parseDateOnly(fromIso).getTime()) / DAY_MS);
}

/** Segunda-feira da semana da data */
export function startOfWeekISO(iso: string): string {
  const dow = parseDateOnly(iso).getDay(); // 0 = domingo
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function startOfMonthISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthISO(iso: string): string {
  const d = parseDateOnly(startOfMonthISO(iso));
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addMonths(iso: string, months: number): string {
  const d = parseDateOnly(startOfMonthISO(iso));
  return toISODate(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

/** Timestamp ISO -> data local "YYYY-MM-DD" */
export function timestampToISODate(ts: string): string {
  return toISODate(new Date(ts));
}

/** Data "YYYY-MM-DD" -> timestamp ISO ao meio-dia local (evita virar o dia por fuso) */
export function dateToTimestamp(iso: string): string {
  const d = parseDateOnly(iso);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return parseDateOnly(iso).toLocaleDateString('pt-BR');
}

export function formatTimestampDate(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatMonthYear(iso: string): string {
  const label = parseDateOnly(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekdayShort(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export function isOverdue(dueDate: string | null, closed: boolean): boolean {
  if (!dueDate || closed) return false;
  return dueDate.slice(0, 10) < todayISO();
}

export function isDueSoon(dueDate: string | null, closed: boolean): boolean {
  if (!dueDate || closed) return false;
  const diff = daysBetween(todayISO(), dueDate);
  return diff >= 0 && diff <= DUE_SOON_DAYS;
}
