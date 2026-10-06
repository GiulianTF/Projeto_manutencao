-- =========================================================
-- Gestão de Manutenção — schema inicial
-- Rodar no SQL Editor do Supabase (ou `supabase db push`).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type demand_status as enum ('pendente', 'em_andamento', 'aguardando_material', 'concluido', 'cancelado');
create type demand_priority as enum ('baixa', 'normal', 'alta', 'urgente');
create type photo_kind as enum ('antes', 'depois');
create type occurrence_status as enum ('pendente', 'concluida', 'nao_realizada');

-- ---------- Usuários (perfil ligado ao auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null default 'tecnico' check (role in ('admin', 'tecnico')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Membro ativo da equipe? (base de todas as políticas RLS)
create or replace function is_team_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

-- ---------- Demandas ----------
create table demands (
  id                  uuid primary key default gen_random_uuid(),
  code                bigint generated always as identity unique, -- nº sequencial legível (#123)
  title               text not null check (length(trim(title)) > 0),
  description         text,
  status              demand_status not null default 'pendente',
  priority            demand_priority not null default 'normal',
  opened_on           date not null default current_date,         -- "data de criação" (editável)
  due_date            date,                                        -- prazo
  completed_at        timestamptz,
  observations        text,
  time_spent_minutes  integer not null default 0 check (time_spent_minutes >= 0),
  responsible_id      uuid references profiles (id),
  created_by          uuid references profiles (id) default auth.uid(),
  updated_by          uuid references profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index demands_status_idx on demands (status);
create index demands_due_date_idx on demands (due_date);
create index demands_opened_on_idx on demands (opened_on);

-- Mantém updated_*, completed_at coerentes com o status
create or replace function demands_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.status = 'concluido' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'concluido' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger demands_before_write
  before insert or update on demands
  for each row execute function demands_before_write();

-- ---------- Fotos ----------
create table demand_photos (
  id            uuid primary key default gen_random_uuid(),
  demand_id     uuid not null references demands (id) on delete cascade,
  kind          photo_kind not null,
  storage_path  text not null,  -- caminho no bucket "demand-photos"
  caption       text,
  created_by    uuid references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);

create index demand_photos_demand_idx on demand_photos (demand_id);

-- ---------- Histórico ----------
create table demand_history (
  id          bigint generated always as identity primary key,
  demand_id   uuid not null references demands (id) on delete cascade,
  actor_id    uuid references profiles (id),
  action      text not null check (action in ('criou', 'alterou', 'foto_adicionada', 'foto_removida')),
  field       text,
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

create index demand_history_demand_idx on demand_history (demand_id, created_at);

-- Histórico gravado no banco: funciona igual venha a alteração de onde vier.
create or replace function log_demand_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  old_json jsonb;
  new_json jsonb;
begin
  if tg_op = 'INSERT' then
    insert into demand_history (demand_id, actor_id, action) values (new.id, auth.uid(), 'criou');
    return new;
  end if;

  old_json := to_jsonb(old);
  new_json := to_jsonb(new);
  foreach f in array array['title', 'description', 'status', 'priority', 'opened_on', 'due_date',
                           'observations', 'time_spent_minutes', 'responsible_id'] loop
    if old_json -> f is distinct from new_json -> f then
      insert into demand_history (demand_id, actor_id, action, field, old_value, new_value)
      values (new.id, auth.uid(), 'alterou', f, old_json ->> f, new_json ->> f);
    end if;
  end loop;
  return new;
end $$;

create trigger demands_history
  after insert or update on demands
  for each row execute function log_demand_changes();

create or replace function log_photo_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into demand_history (demand_id, actor_id, action, new_value)
    values (new.demand_id, auth.uid(), 'foto_adicionada', new.kind::text);
    return new;
  end if;
  insert into demand_history (demand_id, actor_id, action, old_value)
  values (old.demand_id, auth.uid(), 'foto_removida', old.kind::text);
  return old;
end $$;

create trigger demand_photos_history
  after insert or delete on demand_photos
  for each row execute function log_photo_changes();

-- ---------- Rotinas ----------
create table routines (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  description     text,
  weekday         smallint not null check (weekday between 0 and 6), -- 0 = domingo
  interval_weeks  smallint not null default 1 check (interval_weeks >= 1), -- 1 semanal, 2 quinzenal…
  starts_on       date not null default current_date,
  responsible_id  uuid references profiles (id),
  active          boolean not null default true,
  created_by      uuid references profiles (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table routine_occurrences (
  id                  uuid primary key default gen_random_uuid(),
  routine_id          uuid not null references routines (id) on delete cascade,
  scheduled_date      date not null,
  status              occurrence_status not null default 'pendente',
  done_at             timestamptz,
  done_by             uuid references profiles (id),
  observations        text,
  time_spent_minutes  integer not null default 0 check (time_spent_minutes >= 0),
  unique (routine_id, scheduled_date)
);

create index routine_occurrences_date_idx on routine_occurrences (scheduled_date);

-- Gera (idempotente) as ocorrências das rotinas ativas no intervalo.
-- Chamada pelo app ao abrir Rotinas/Dashboard; opcionalmente também via pg_cron.
create or replace function generate_routine_occurrences(
  p_from date default current_date,
  p_until date default current_date + 14
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  inserted integer;
begin
  if not is_team_member() and auth.uid() is not null then
    raise exception 'acesso negado';
  end if;

  insert into routine_occurrences (routine_id, scheduled_date)
  select r.id, d::date
  from routines r,
       generate_series(greatest(p_from, r.starts_on)::timestamp, p_until::timestamp, interval '1 day') d
  where r.active
    and extract(dow from d) = r.weekday
    and ((d::date - r.starts_on) / 7) % r.interval_weeks = 0
  on conflict (routine_id, scheduled_date) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end $$;

revoke execute on function generate_routine_occurrences(date, date) from public, anon;
grant execute on function generate_routine_occurrences(date, date) to authenticated;

-- ---------- RLS: equipe inteira vê e edita tudo (sem divisão por usuário) ----------
alter table profiles enable row level security;
alter table demands enable row level security;
alter table demand_photos enable row level security;
alter table demand_history enable row level security;
alter table routines enable row level security;
alter table routine_occurrences enable row level security;

create policy "equipe lê perfis" on profiles for select to authenticated using (is_team_member());
create policy "usuário edita o próprio perfil" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "equipe gerencia demandas" on demands for all to authenticated
  using (is_team_member()) with check (is_team_member());
create policy "equipe gerencia fotos" on demand_photos for all to authenticated
  using (is_team_member()) with check (is_team_member());
create policy "equipe lê histórico" on demand_history for select to authenticated
  using (is_team_member()); -- escrita só via triggers
create policy "equipe gerencia rotinas" on routines for all to authenticated
  using (is_team_member()) with check (is_team_member());
create policy "equipe gerencia ocorrências" on routine_occurrences for all to authenticated
  using (is_team_member()) with check (is_team_member());

-- ---------- Storage: fotos (bucket privado) ----------
insert into storage.buckets (id, name, public)
values ('demand-photos', 'demand-photos', false)
on conflict (id) do nothing;

create policy "equipe lê fotos" on storage.objects for select to authenticated
  using (bucket_id = 'demand-photos' and is_team_member());
create policy "equipe envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'demand-photos' and is_team_member());
create policy "equipe remove fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'demand-photos' and is_team_member());

-- ---------- Realtime: alterações aparecem para o outro usuário ----------
alter publication supabase_realtime add table demands, demand_photos, routines, routine_occurrences;
