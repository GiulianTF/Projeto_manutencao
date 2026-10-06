import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  /** use "div" quando o conteúdo não é um único input (ex.: grupo de chips) */
  as?: 'label' | 'div';
  className?: string;
}

export function Field({ label, hint, error, children, as = 'label', className }: FieldProps) {
  const Tag = as;
  return (
    <Tag className={`field ${className ?? ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </Tag>
  );
}
