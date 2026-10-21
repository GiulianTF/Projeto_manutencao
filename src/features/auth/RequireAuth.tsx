import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button, Loading } from '@/components/ui';
import { useAuth } from './AuthProvider';

/**
 * Protege as rotas internas. Enquanto o Supabase não estiver configurado,
 * libera o acesso para permitir desenvolver a interface (modo dev).
 */
export function RequireAuth() {
  const { session, profile, loading, authError } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Outlet />;
  if (loading) return <Loading label="Validando acesso…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (authError) {
    return (
      <div className="auth-page">
        <div className="card auth-card stack">
          <p className="alert alert--warning">{authError}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  if (!profile?.active) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
