import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/domain';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let revision = 0;

    async function syncSession(next: Session | null) {
      const request = ++revision;
      setSession(next);
      setAuthError(null);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', next.user.id)
          .maybeSingle();
        if (!mounted || request !== revision) return;

        if (error) {
          setProfile(null);
          setAuthError('Não foi possível validar seu perfil. Verifique sua conexão e tente novamente.');
          setLoading(false);
          return;
        }
        if (!data || !data.active) {
          setProfile(null);
          setLoading(false);
          void supabase!.auth.signOut();
          return;
        }

        setProfile(data as Profile);
        setLoading(false);
      } catch {
        if (!mounted || request !== revision) return;
        setProfile(null);
        setAuthError('Não foi possível validar seu perfil. Verifique sua conexão e tente novamente.');
        setLoading(false);
      }
    }

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session)).catch(() => {
      if (!mounted) return;
      setAuthError('Não foi possível recuperar sua sessão. Recarregue a página para tentar novamente.');
      setLoading(false);
    });
    const unsubscribe = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase recomenda não aguardar chamadas de rede dentro do callback.
      queueMicrotask(() => void syncSession(next));
    });
    return () => {
      mounted = false;
      revision += 1;
      unsubscribe.data.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase ainda não configurado (.env.local).';
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return 'E-mail ou senha inválidos.';

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 'Não foi possível validar sua conta. Tente novamente.';
      const { data: member, error: profileError } = await supabase
        .from('profiles')
        .select('id, active')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (profileError) {
        await supabase.auth.signOut();
        return 'Não foi possível validar seu perfil. Tente novamente.';
      }
      if (!member?.active) {
        await supabase.auth.signOut();
        return 'Acesso desativado. Solicite ajuda ao administrador da equipe.';
      }
      return null;
    } catch {
      return 'Não foi possível entrar. Verifique sua conexão e tente novamente.';
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  async function updatePassword(password: string): Promise<string | null> {
    if (!supabase) return 'Supabase ainda não configurado.';
    const { error } = await supabase.auth.updateUser({ password });
    return error ? error.message : null;
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, authError, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
