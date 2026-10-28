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

-- 5) Drei Räume (A-034): Familie sehen alle im Haushalt (auch Aufgaben, jeder
-- darf abhaken), „ich“ und „arbeit“ nur der Besitzer – Termine wie Aufgaben.
-- Zeilen im Format der App (ganzer Eintrag in `data`, Inhalt in data.data).
insert into auth.users (id, email) values
  ('d2222222-0000-0000-0000-000000000001', 'raum-felix@example.com'),
  ('d2222222-0000-0000-0000-000000000002', 'raum-lisa@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000001', false);
select public.create_household('Familie Raum', 'Felix');
select public.create_invite_link('erwachsener') as tok2 \gset
select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000002', false);
select public.join_by_link(:'tok2', 'Lisa');

select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000001', false);
select pruefe((public.sync_entries('[
  {"id":"r-tf","typ":"termin","raum":"familie","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Elternabend"}}},
  {"id":"r-ti","typ":"termin","raum":"ich","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Zahnarzt"}}},
  {"id":"r-ta","typ":"termin","raum":"arbeit","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Lieferant"}}},
  {"id":"r-af","typ":"aufgabe","raum":"familie","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Müll rausbringen"}}},
  {"id":"r-ai","typ":"aufgabe","raum":"ich","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Geschenk für Lisa"}}},
  {"id":"r-aa","typ":"aufgabe","raum":"arbeit","geaendert":"2026-10-28T08:00:00Z","data":{"data":{"title":"Angebot schreiben"}}},
  {"id":"r-ag","typ":"aufgabe","raum":"ich","geaendert":"2026-10-28T08:00:00Z","data":{"id":"r-ag","raum":"ich","data":{"title":"Turnbeutel waschen","fuer":"d2222222-0000-0000-0000-000000000002"}}}
]') ->> 'ok')::int = 7, 'Felix lädt Familie, Ich und Arbeit hoch');
select pruefe((select count(*) from public.entries where id like 'r-%') = 7, 'Felix sieht alles von sich');

select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000002', false);
select pruefe((select count(*) from public.entries where id = 'r-tf') = 1, 'Familie-Termin kommt bei Lisa an');
select pruefe((select count(*) from public.entries where id = 'r-af') = 1, 'Familie-Aufgabe kommt bei Lisa an');
select pruefe((select count(*) from public.entries where id in ('r-ti', 'r-ta', 'r-ai', 'r-aa')) = 0, 'Ich und Arbeit (Termine und Aufgaben) kommen bei Lisa nie an');
select pruefe((select count(*) from public.entries where id = 'r-ag') = 1, 'abgegebene Ich-Aufgabe kommt an (fuer in data.data, Fehler A-028)');
-- Lisa hakt die Familien-Aufgabe ab („erledigt von Lisa“)
select pruefe((public.sync_entries('[{"id":"r-af","typ":"aufgabe","raum":"familie","geaendert":"2026-10-28T09:00:00Z","data":{"data":{"title":"Müll rausbringen","doneOn":"2026-10-28","doneBy":"d2222222-0000-0000-0000-000000000002"}}}]') -> 'skipped') = '[]'::jsonb, 'Lisa darf die Familien-Aufgabe abhaken');
-- … darf sie Felix aber nicht wegnehmen (auf „ich“ stellen) und Ich/Arbeit nicht anfassen
select pruefe((public.sync_entries('[{"id":"r-af","typ":"aufgabe","raum":"ich","geaendert":"2026-10-28T10:00:00Z","data":{"data":{"title":"weg"}}}]') -> 'skipped') ? 'r-af', 'Lisa stellt Felix’ Familien-Aufgabe nicht auf „ich“');
select pruefe((public.sync_entries('[{"id":"r-tf","typ":"termin","raum":"arbeit","geaendert":"2026-10-28T10:00:00Z","data":{}}]') -> 'skipped') ? 'r-tf', 'Lisa macht Felix’ Familien-Termin nicht zu Arbeit');
select pruefe((public.sync_entries('[{"id":"r-ti","typ":"termin","raum":"ich","geaendert":"2026-10-28T10:00:00Z","data":{"data":{"title":"gehackt"}}}]') -> 'skipped') ? 'r-ti', 'Lisa überschreibt Felix’ Ich-Termin nicht');
-- Lisa hakt die abgegebene Aufgabe ab und gibt sie zurück
select pruefe((public.sync_entries('[{"id":"r-ag","typ":"aufgabe","raum":"ich","geaendert":"2026-10-28T11:00:00Z","data":{"id":"r-ag","raum":"ich","data":{"title":"Turnbeutel waschen","zurueck":"d2222222-0000-0000-0000-000000000002"}}}]') -> 'skipped') = '[]'::jsonb, 'Lisa gibt die Ich-Aufgabe zurück');

select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000001', false);
select pruefe((select data -> 'data' ->> 'doneBy' from public.entries where id = 'r-af') = 'd2222222-0000-0000-0000-000000000002', 'Felix sieht „erledigt von Lisa“');
select pruefe((select raum from public.entries where id = 'r-af') = 'familie', 'Familien-Aufgabe bleibt Familie');
select pruefe((select data -> 'data' ->> 'title' from public.entries where id = 'r-ti') = 'Zahnarzt', 'Ich-Termin unverändert');
-- Felix stellt selbst um: Familie → Ich, dann sieht Lisa sie nicht mehr
select public.sync_entries('[{"id":"r-tf","typ":"termin","raum":"ich","geaendert":"2026-10-28T12:00:00Z","data":{"data":{"title":"Elternabend"}}}]');
select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000002', false);
select pruefe((select count(*) from public.entries where id = 'r-tf') = 0, 'auf „Ich“ gestellt: für Lisa weg');
-- Unbekannter Raum geht nicht
select pruefe((public.sync_entries('[{"id":"r-x","typ":"termin","raum":"geheim","geaendert":"2026-10-28T12:00:00Z","data":{}}]') -> 'skipped') ? 'r-x', 'nur familie, ich, arbeit');
-- Felix geht: „ich“ und „arbeit“ nimmt er mit, Familie bleibt
select set_config('request.jwt.claim.sub', 'd2222222-0000-0000-0000-000000000001', false);
select public.leave_household();
reset role;
select pruefe((select count(*) from public.entries where id in ('r-ti', 'r-ta', 'r-ai', 'r-aa', 'r-ag', 'r-tf')) = 0, 'Verlassen nimmt Ich und Arbeit mit');
select pruefe((select count(*) from public.entries where id = 'r-af') = 1, 'Familien-Aufgabe bleibt im Haushalt');

-- 6) Migration: bestehende Aufgaben werden einmalig „ich“ (nichts verloren),
-- Termine bleiben; ein zweites Einspielen verschiebt nichts mehr.
select pruefe(obj_description('public.entries'::regclass, 'pg_class') like '%raeume-ich%', 'Umstellung ist vermerkt');
comment on table public.entries is null;
insert into public.entries (household_id, id, typ, raum, besitzer, geaendert, data)
  select household_id, 'r-alt', 'aufgabe', 'familie', 'd2222222-0000-0000-0000-000000000001', '2026-10-01T08:00:00Z', '{"data":{"title":"Alte Aufgabe"}}' from public.entries where id = 'r-af';
insert into public.entries (household_id, id, typ, raum, besitzer, geaendert, data)
  select household_id, 'r-altt', 'termin', 'familie', 'd2222222-0000-0000-0000-000000000001', '2026-10-01T08:00:00Z', '{"data":{"title":"Alter Termin"}}' from public.entries where id = 'r-af';
\ir 20261101120000_raeume_ich.sql
select pruefe((select raum from public.entries where id = 'r-alt') = 'ich', 'bestehende Aufgabe → ich');
select pruefe((select data -> 'data' ->> 'title' from public.entries where id = 'r-alt') = 'Alte Aufgabe', 'Inhalt bleibt');
select pruefe((select raum from public.entries where id = 'r-altt') = 'familie', 'bestehender Termin bleibt Familie');
update public.entries set raum = 'familie' where id = 'r-alt';
\ir 20261101120000_raeume_ich.sql
select pruefe((select raum from public.entries where id = 'r-alt') = 'familie', 'zweites Einspielen verschiebt keine neuen Familien-Aufgaben');
delete from public.entries where id like 'r-%';
delete from auth.users where id in ('d2222222-0000-0000-0000-000000000001', 'd2222222-0000-0000-0000-000000000002');
