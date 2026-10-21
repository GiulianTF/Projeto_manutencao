import { useEffect, useState, type FormEvent } from 'react';
import { Database, Download, LogOut, UserPlus } from 'lucide-react';
import { Button, errorMessage, Field, PageHeader, useToast } from '@/components/ui';
import { localTools, store } from '@/data';
import { useCurrentUserId, useProfiles } from '@/data/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { downloadBlob } from '@/lib/download';
import { todayISO } from '@/lib/date';
import type { UserRole } from '@/types/domain';

export function SettingsPage() {
  const toast = useToast();
  const { signOut, updatePassword } = useAuth();
  const { profiles } = useProfiles();
  const currentUserId = useCurrentUserId();
  const me = profiles.find((p) => p.id === currentUserId);
  const isAdmin = me?.role === 'admin' && me.active;
  const [name, setName] = useState('');
  const [newMember, setNewMember] = useState('');
  const [email, setEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null);

  useEffect(() => setName(me?.full_name ?? ''), [me?.full_name]);

  async function saveName() {
    if (!me || !name.trim()) return;
    try {
      await store.updateProfile(me.id, { full_name: name.trim() });
      toast('Nome atualizado');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast('A senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
    const error = await updatePassword(newPassword);
    if (error) {
      toast(error, 'error');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    toast('Senha atualizada');
  }

  async function backup() {
    try {
      const data = await store.exportAll();
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `backup-manutencao-${todayISO()}.json`);
      toast('Backup baixado');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function addLocalMember() {
    if (!localTools || !isAdmin || !newMember.trim()) return;
    try {
      await localTools.addProfile(newMember.trim());
      setNewMember('');
      toast('Colaborador de teste adicionado');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function createEmployee(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || store.mode !== 'supabase') return;
    setCreating(true);
    try {
      await store.createEmployee({ full_name: newMember.trim(), email: email.trim(), password: initialPassword });
      setNewMember('');
      setEmail('');
      setInitialPassword('');
      toast('Colaborador cadastrado. Compartilhe a senha inicial com ele.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function updateAccess(id: string, patch: { role?: UserRole; active?: boolean }) {
    setUpdatingProfileId(id);
    try {
      await store.updateProfileAccess(id, patch);
      toast('Acesso do colaborador atualizado');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setUpdatingProfileId(null);
    }
  }

  async function resetLocal() {
    if (!localTools || !confirm('Apagar TODOS os dados locais (demandas, fotos e rotinas)?')) return;
    await localTools.reset();
    toast('Dados locais apagados');
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="stack settings">
        {store.mode === 'local' && (
          <div className="alert alert--warning">
            <Database size={18} />
            <span>
              <strong>Modo local:</strong> os dados ficam só neste navegador. Configure o Supabase (<code>.env.local</code>) para
              usar login e contas reais da equipe.
            </span>
          </div>
        )}

        <section className="card stack">
          <h2 className="card__title">Meu perfil</h2>
          <Field label="Nome exibido no histórico">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="row">
            <Button onClick={saveName} disabled={!name.trim() || name === me?.full_name}>
              Salvar nome
            </Button>
            {store.mode === 'supabase' && (
              <Button variant="secondary" onClick={signOut}>
                <LogOut size={16} /> Sair
              </Button>
            )}
          </div>
        </section>

        {store.mode === 'supabase' && (
          <form className="card stack" onSubmit={savePassword}>
            <h2 className="card__title">Alterar senha</h2>
            <Field label="Nova senha" hint="Use pelo menos 8 caracteres.">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirme a nova senha">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <div className="row">
              <Button type="submit" disabled={!newPassword || !confirmPassword}>
                Atualizar senha
              </Button>
            </div>
          </form>
        )}

        <section className="card stack">
          <h2 className="card__title">Equipe</h2>
          <ul className="team-list">
            {profiles.map((p) => {
              const isCurrentUser = p.id === currentUserId;
              const isUpdating = updatingProfileId === p.id;
              return (
                <li key={p.id} className="team-list__item team-list__item--managed">
                  <span className="team-list__identity">
                    <strong>
                      {p.full_name}
                      {isCurrentUser && <span className="text-muted"> (você)</span>}
                    </strong>
                    <span className="text-muted">{p.email || (localTools ? 'Usuário de teste local' : 'E-mail não cadastrado')}</span>
                  </span>
                  {localTools && !isCurrentUser ? (
                    <span className="team-list__controls">
                      {isAdmin && (
                        <>
                          <select
                            className="input team-list__role"
                            aria-label={`Papel de ${p.full_name}`}
                            value={p.role}
                            disabled={isUpdating}
                            onChange={(e) => void updateAccess(p.id, { role: e.target.value as UserRole })}
                          >
                            <option value="tecnico">Colaborador</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <Button
                            variant={p.active ? 'secondary' : 'ghost'}
                            disabled={isUpdating}
                            onClick={() => void updateAccess(p.id, { active: !p.active })}
                          >
                            {p.active ? 'Desativar' : 'Reativar'}
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" disabled={!p.active} onClick={() => void localTools?.setCurrentUser(p.id)}>
                        Usar como este usuário
                      </Button>
                    </span>
                  ) : isAdmin && !isCurrentUser ? (
                    <span className="team-list__controls">
                      <select
                        className="input team-list__role"
                        aria-label={`Papel de ${p.full_name}`}
                        value={p.role}
                        disabled={isUpdating}
                        onChange={(e) => void updateAccess(p.id, { role: e.target.value as UserRole })}
                      >
                        <option value="tecnico">Colaborador</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <Button
                        variant={p.active ? 'secondary' : 'ghost'}
                        disabled={isUpdating}
                        onClick={() => void updateAccess(p.id, { active: !p.active })}
                      >
                        {p.active ? 'Desativar' : 'Reativar'}
                      </Button>
                    </span>
                  ) : (
                    <span className="text-muted">
                      {!p.active ? 'Inativo' : p.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {isAdmin && localTools && (
            <div className="row">
              <input
                className="input team-list__input"
                placeholder="Nome do colaborador de teste"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
              />
              <Button variant="secondary" onClick={addLocalMember} disabled={!newMember.trim()}>
                <UserPlus size={16} /> Adicionar teste
              </Button>
            </div>
          )}

          {isAdmin && store.mode === 'supabase' && (
            <form className="employee-form" onSubmit={createEmployee}>
              <h3 className="employee-form__title">Cadastrar colaborador</h3>
              <div className="employee-form__fields">
                <Field label="Nome completo">
                  <input
                    className="input"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                  />
                </Field>
                <Field label="E-mail de acesso">
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Senha inicial" hint="O colaborador pode trocá-la em Meu perfil.">
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="row">
                <Button type="submit" variant="secondary" disabled={creating}>
                  <UserPlus size={16} /> {creating ? 'Cadastrando…' : 'Criar conta de colaborador'}
                </Button>
              </div>
            </form>
          )}

          {!isAdmin && <p className="field__hint">O cadastro e o gerenciamento de acessos são feitos por um administrador.</p>}
        </section>

        <section className="card stack">
          <h2 className="card__title">Backup</h2>
          <p className="text-muted">
            Baixa uma cópia completa dos dados (demandas, histórico, rotinas e ocorrências) em JSON. As fotos ficam no
            armazenamento e não entram neste arquivo.
          </p>
          <div className="row">
            <Button variant="secondary" onClick={backup}>
              <Download size={16} /> Baixar backup
            </Button>
            {localTools && (
              <Button variant="danger" onClick={resetLocal}>
                Apagar dados locais
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
