export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** texto exibido no lugar do número (ex.: "03h20") */
  display?: string;
  /** cor da barra; o texto sempre usa as cores de texto */
  color?: string;
}

/** Barras horizontais com rótulo e valor sempre visíveis (sem depender de cor). */
export function BarList({ items, label }: { items: BarItem[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bar-list" aria-label={label}>
      {items.map((i) => (
        <li key={i.key} className="bar-list__row" title={`${i.label}: ${i.display ?? i.value}`}>
          <span className="bar-list__label">{i.label}</span>
          <span className="bar-list__track">
            <span
              className="bar-list__bar"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? 'var(--color-primary)' }}
            />
          </span>
          <span className="bar-list__value">{i.display ?? i.value}</span>
        </li>
      ))}
    </ul>
  );
}
