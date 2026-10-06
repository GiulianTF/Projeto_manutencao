/** 90 -> "01h30" */
export function formatMinutes(total: number): string {
  const safe = Math.max(0, Math.round(total));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

/** Aceita "01h30", "1h", "1:30", "90min", "90". Retorna minutos ou null se inválido. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;

  let match = s.match(/^(\d+)h(\d{1,2})?(m|min)?$/);
  if (match) return Number(match[1]) * 60 + Number(match[2] ?? 0);

  match = s.match(/^(\d+):(\d{1,2})$/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);

  match = s.match(/^(\d+)(m|min)?$/);
  if (match) return Number(match[1]);

  return null;
}
