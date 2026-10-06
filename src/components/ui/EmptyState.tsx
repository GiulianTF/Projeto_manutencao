import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon className="empty-state__icon" size={40} strokeWidth={1.5} />
      <h2 className="empty-state__title">{title}</h2>
      {children}
    </div>
  );
}
