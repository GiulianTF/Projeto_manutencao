import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  // Após o login a sessão muda e este redirect acontece sozinho.
  if (session) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(await signIn(email, password));
    setSubmitting(false);
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-card__brand">
          <span className="sidebar__logo">
            <Wrench size={18} />
          </span>
          <h1>Gestão de Manutenção</h1>
          <p className="text-muted">Entre com seu usuário da equipe</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="alert alert--warning" style={{ marginBottom: 'var(--space-4)' }}>
            Supabase ainda não configurado. Copie <code>.env.example</code> para <code>.env.local</code>.
          </div>
        )}

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">E-mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Senha</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="field__error">{error}</p>}
          <Button type="submit" size="lg" block disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
