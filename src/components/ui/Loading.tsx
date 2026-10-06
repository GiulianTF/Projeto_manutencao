export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading__spinner" aria-hidden />
      {label}
    </div>
  );
}
