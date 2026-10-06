import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * Protege as rotas internas. Enquanto o Supabase não estiver configurado,
 * libera o acesso para permitir desenvolver a interface (modo dev).
 */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Outlet />;
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
