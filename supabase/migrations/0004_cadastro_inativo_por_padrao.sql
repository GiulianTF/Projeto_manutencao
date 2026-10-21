-- Conta criada fora do fluxo do administrador (ex.: cadastro público esquecido ligado
-- no painel) nasce inativa e, portanto, sem acesso a nada protegido pelo RLS.
-- Quem ativa é a função gerenciar-colaboradores, logo depois de criar a conta.

alter table public.profiles alter column active set default false;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'tecnico',
    false
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
