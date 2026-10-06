import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: number | string;
  /** cor da borda lateral, ex: 'var(--status-concluido-dot)' */
  accent?: string;
  /** torna o card um link (ex.: lista já filtrada) */
  to?: string;
}

export function StatCard({ label, value, accent, to }: StatCardProps) {
  const style = accent ? { ['--stat-accent' as string]: accent } : undefined;
  const content = (
    <>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </>
  );
  return to ? (
    <Link to={to} className="stat-card stat-card--link" style={style}>
      {content}
    </Link>
  ) : (
    <div className="stat-card" style={style}>
      {content}
    </div>
  );
}
