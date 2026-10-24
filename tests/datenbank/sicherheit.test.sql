-- Datenschutz & Sicherheit (Platz 23): JEDE Tabelle im Schema public hat
-- Row Level Security, „anon“ darf an keiner Tabelle etwas, und Familien
-- sind voneinander getrennt – wer austritt, sieht sofort nichts mehr.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
grant execute on function pruefe(boolean, text) to anon, authenticated;

-- 1) RLS auf jeder Tabelle
select pruefe(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'jede Tabelle in public hat Row Level Security: ' || coalesce((
  select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), ''));

-- 2) anon hat an keiner Tabelle Rechte
select pruefe(not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
), 'anon darf an keiner Tabelle etwas: ' || coalesce((
  select string_agg(distinct table_name, ', ') from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'), ''));

-- 3) Tabellen, die angemeldete Personen lesen dürfen, haben auch eine Regel (sonst wäre RLS offen gedacht, aber zu)
select pruefe(not exists (
  select 1 from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.grantee = 'authenticated' and g.privilege_type = 'SELECT'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = g.table_name)
), 'jede lesbare Tabelle hat eine Regel');

-- 4) Familien getrennt, Austritt wirkt sofort
insert into auth.users (id, email) values
  ('d1111111-0000-0000-0000-000000000001', 'sicher-a@example.com'),
  ('d1111111-0000-0000-0000-000000000002', 'sicher-b@example.com'),
  ('d1111111-0000-0000-0000-000000000003', 'sicher-c@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-0000-0000-0000-000000000001', false);
select public.create_household('Familie Sicher', 'Ana');
select public.sync_entries('[{"id":"sicher-t1","typ":"termin","raum":"familie","geaendert":"2026-10-22T08:00:00Z","data":{"title":"Geheim"}}]');
select public.create_invite_link('erwachsener') as tok \gset

select set_config('request.jwt.claim.sub', 'd1111111-0000-0000-0000-000000000002', false);
select public.create_household('Familie Fremd', 'Bo');
select pruefe((select count(*) from public.entries where id = 'sicher-t1') = 0, 'andere Familie sieht den Termin nicht');
select pruefe((select count(*) from public.members where display_name = 'Ana') = 0, 'andere Familie sieht die Mitglieder nicht');
update public.entries set data = '{"title":"überschrieben"}' where id = 'sicher-t1';

select set_config('request.jwt.claim.sub', 'd1111111-0000-0000-0000-000000000003', false);
select public.join_by_link(:'tok', 'Cleo');
select pruefe((select count(*) from public.entries where id = 'sicher-t1') = 1, 'Mitglied sieht den Familien-Termin');
select pruefe((select data->>'title' from public.entries where id = 'sicher-t1') = 'Geheim', 'Fremde konnten nichts ändern');
select public.leave_household();
select pruefe((select count(*) from public.entries where id = 'sicher-t1') = 0, 'nach dem Austritt sofort nichts mehr');
select pruefe((select count(*) from public.members) = 0, 'nach dem Austritt keine Mitglieder mehr sichtbar');

reset role;
