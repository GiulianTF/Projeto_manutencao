import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CircleUser, ClipboardList, LayoutDashboard, LogOut, Menu, Plus, Repeat, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { store } from '@/data';
import { useCurrentUserId, useProfiles } from '@/data/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { NAV_ITEMS } from './navigation';

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { nameOf } = useProfiles();
  const currentUserId = useCurrentUserId();

  // Fecha a gaveta ao navegar
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar${drawerOpen ? ' sidebar--open' : ''}`} aria-label="Menu principal">
        <div className="sidebar__brand">
          <span className="sidebar__logo">
            <Wrench size={18} />
          </span>
          Manutenção
          <Button
            variant="ghost"
            iconOnly
            className="sidebar__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </Button>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <Link to="/demandas/nova" className="btn btn--primary btn--lg btn--block">
            <Plus size={18} /> Nova demanda
          </Link>
          <div className="sidebar__user">
            <span className="sidebar__user-name">
              <CircleUser size={18} /> {nameOf(currentUserId)}
            </span>
            {store.mode === 'supabase' ? (
              <Button variant="ghost" iconOnly onClick={signOut} aria-label="Sair" title="Sair">
                <LogOut size={18} />
              </Button>
            ) : (
              <span className="badge badge--status-pendente" title="Dados só neste navegador">
                Local
              </span>
            )}
          </div>
        </div>
      </aside>
      <div
        className={`sidebar-backdrop${drawerOpen ? ' sidebar-backdrop--visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <header className="topbar">
        <Button variant="ghost" iconOnly onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
          <Menu size={22} />
        </Button>
        Manutenção
      </header>

      <main className="main">
        <div className="main__inner">
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navegação rápida">
        <NavLink to="/" end className="bottom-nav__item">
          <LayoutDashboard size={22} />
          Início
        </NavLink>
        <NavLink to="/demandas" end className="bottom-nav__item">
          <ClipboardList size={22} />
          Demandas
        </NavLink>
        <NavLink to="/demandas/nova" className="bottom-nav__item bottom-nav__item--primary">
          <span className="bottom-nav__icon">
            <Plus size={24} />
          </span>
          Nova
        </NavLink>
        <NavLink to="/rotinas" className="bottom-nav__item">
          <Repeat size={22} />
          Rotinas
        </NavLink>
        <button type="button" className="bottom-nav__item" onClick={() => setDrawerOpen(true)}>
          <Menu size={22} />
          Mais
        </button>
      </nav>
    </div>
  );
}
