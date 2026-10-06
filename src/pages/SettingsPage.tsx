import { useEffect, useState } from 'react';
import { Database, Download, LogOut, UserPlus } from 'lucide-react';
import { Button, errorMessage, Field, PageHeader, useToast } from '@/components/ui';
import { localTools, store } from '@/data';
import { useCurrentUserId, useProfiles } from '@/data/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { downloadBlob } from '@/lib/download';
import { todayISO } from '@/lib/date';

export function SettingsPage() {
  const toast = useToast();
  const { signOut } = useAuth();
  const { profiles } = useProfiles();
  const currentUserId = useCurrentUserId();
  const me = profiles.find((p) => p.id === currentUserId);
  const [name, setName] = useState('');
  const [newMember, setNewMember] = useState('');

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

  async function backup() {
    try {
      const data = await store.exportAll();
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `backup-manutencao-${todayISO()}.json`);
      toast('Backup baixado');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function addMember() {
    if (!localTools || !newMember.trim()) return;
    await localTools.addProfile(newMember.trim());
    setNewMember('');
    toast('Usuário adicionado');
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
              usar online com a equipe.
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

        <section className="card stack">
          <h2 className="card__title">Equipe</h2>
          <ul className="team-list">
            {profiles.map((p) => (
              <li key={p.id} className="team-list__item">
                <span>
                  {p.full_name}
                  {p.id === currentUserId && <span className="text-muted"> (você)</span>}
                </span>
                {localTools ? (
                  p.id !== currentUserId && (
                    <Button variant="ghost" onClick={() => localTools!.setCurrentUser(p.id)}>
                      Usar como este usuário
                    </Button>
                  )
                ) : (
                  <span className="text-muted">{p.active ? (p.role === 'admin' ? 'Administrador' : 'Técnico') : 'Inativo'}</span>
                )}
              </li>
            ))}
          </ul>
          {localTools ? (
            <div className="row">
              <input
                className="input team-list__input"
                placeholder="Nome do novo usuário"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
              />
              <Button variant="secondary" onClick={addMember} disabled={!newMember.trim()}>
                <UserPlus size={16} /> Adicionar
              </Button>
            </div>
          ) : (
            <p className="field__hint">
              Para adicionar alguém, crie o usuário no painel do Supabase (Authentication → Add user). O perfil aparece aqui
              automaticamente.
            </p>
          )}
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
