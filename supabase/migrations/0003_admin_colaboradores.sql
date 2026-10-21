-- Administração de contas, perfis e acesso da equipe.

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id and p.email is distinct from lower(u.email);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'tecnico',
    true
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

create or replace function public.is_active_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

revoke execute on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

-- Colaboradores podem alterar o próprio nome, sem poder se promover ou se reativar.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create or replace function public.admin_update_profile(
  p_profile_id uuid,
  p_role text default null,
  p_active boolean default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_role text;
  target_active boolean;
  active_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'autenticação necessária' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in ('admin', 'tecnico') then
    raise exception 'papel inválido';
  end if;
  if p_role is null and p_active is null then
    raise exception 'nenhuma alteração informada';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'não é possível alterar o próprio acesso';
  end if;

  -- Serializa mudanças de acesso para evitar a remoção simultânea dos administradores.
  perform pg_advisory_xact_lock(0, hashtext('admin_update_profile'));
  if not public.is_active_admin() then
    raise exception 'somente um administrador ativo pode gerenciar colaboradores' using errcode = '42501';
  end if;

  select role, active into target_role, target_active
  from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'colaborador não encontrado';
  end if;

  if target_role = 'admin' and target_active
     and ((p_role is not null and p_role <> 'admin') or p_active is false) then
    select count(*) into active_admin_count
    from public.profiles where role = 'admin' and active;
    if active_admin_count <= 1 then
      raise exception 'o sistema precisa manter pelo menos um administrador ativo';
    end if;
  end if;

  update public.profiles
  set role = coalesce(p_role, role), active = coalesce(p_active, active)
  where id = p_profile_id;
end $$;

revoke execute on function public.admin_update_profile(uuid, text, boolean) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, boolean) to authenticated;

-- Inclui atualizações de perfis no canal usado pela tela de equipe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
