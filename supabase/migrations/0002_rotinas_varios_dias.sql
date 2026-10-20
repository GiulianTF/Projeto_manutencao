-- Permite agendar uma rotina em vários dias da semana sem perder os registros existentes.
begin;

alter table routines
  add column weekdays smallint[] not null default array[1]::smallint[];

update routines
set weekdays = array[weekday]::smallint[];

alter table routines
  add constraint routines_weekdays_valid
  check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  );

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
    and extract(dow from d)::smallint = any(r.weekdays)
    and ((d::date - r.starts_on) / 7) % r.interval_weeks = 0
  on conflict (routine_id, scheduled_date) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end $$;

revoke execute on function generate_routine_occurrences(date, date) from public, anon;
grant execute on function generate_routine_occurrences(date, date) to authenticated;

alter table routines drop column weekday;

commit;
