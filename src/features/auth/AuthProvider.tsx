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
    // Usuário cujo perfil já foi validado (ou está sendo) nesta sessão do app.
    let validatedUserId: string | null = null;
    let checkingUserId: string | null = null;

    async function syncSession(next: Session | null) {
      if (!next) {
        revision += 1;
        validatedUserId = null;
        checkingUserId = null;
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(next);
      // Renovação de token, troca de senha e volta à aba repetem o evento para o
      // mesmo usuário: não revalida, senão a tela desmonta e perde o que foi digitado.
      // getSession e o evento INITIAL_SESSION também chegam juntos na abertura.
      if (next.user.id === validatedUserId || next.user.id === checkingUserId) return;

      const request = ++revision;
      checkingUserId = next.user.id;
      setAuthError(null);
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
          // Limpa a sessão já aqui: se ficasse ativa até o signOut terminar, RequireAuth
          // e LoginPage ficariam redirecionando um para o outro.
          setSession(null);
          setProfile(null);
          setAuthError('Acesso desativado. Solicite ajuda ao administrador da equipe.');
          setLoading(false);
          void supabase!.auth.signOut({ scope: 'local' });
          return;
        }

        validatedUserId = next.user.id;
        setProfile(data as Profile);
        setLoading(false);
      } catch {
        if (!mounted || request !== revision) return;
        setProfile(null);
        setAuthError('Não foi possível validar seu perfil. Verifique sua conexão e tente novamente.');
        setLoading(false);
      } finally {
        // Em caso de erro, o próximo evento tenta validar de novo.
        if (request === revision) checkingUserId = null;
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
    setAuthError(null);
    try {
      // O perfil (ativo ou não) é validado uma única vez em syncSession, no evento SIGNED_IN.
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? 'E-mail ou senha inválidos.' : null;
    } catch {
      return 'Não foi possível entrar. Verifique sua conexão e tente novamente.';
    }
  }

  async function signOut() {
    setAuthError(null);
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
