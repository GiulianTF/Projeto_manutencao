import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Repeat,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/demandas', label: 'Demandas', icon: ClipboardList },
  { to: '/rotinas', label: 'Rotinas', icon: Repeat },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/exportar', label: 'Exportar Excel', icon: FileSpreadsheet },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];
