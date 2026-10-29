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

-- 2) anon hat an keiner Tabelle Rechte – einzige Ausnahme: „Was los?“
--    (region_events, region_status) nur lesen, öffentliche Veranstaltungen (Abschnitt 8)
select pruefe(not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
    and not (table_name in ('region_events', 'region_status') and privilege_type = 'SELECT')
), 'anon darf an keiner Tabelle etwas: ' || coalesce((
  select string_agg(distinct table_name || ' ' || privilege_type, ', ') from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
    and not (table_name in ('region_events', 'region_status') and privilege_type = 'SELECT')), ''));

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

-- 7) Pinnwand „Nur für mich“ (Tafel 123): private Zettel sieht und ändert nur
--    der Besitzer – wie „ich“ und „arbeit“; niemand macht fremde Zettel privat;
--    Bilder privater Zettel bleiben beim Besitzer. Abschnitt 6 hat die
--    Raum-Migration noch einmal eingespielt, daher die Pinnwand-Regeln wieder
--    darüber (so wie die Migrationen in der Reihenfolge laufen).
\ir 20261101130000_pinnwand_nur_fuer_mich.sql
create or replace function erwarte_fehler(stmt text, muster text, was text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm like '%' || muster || '%' then return; end if;
    raise exception 'FALSCHER FEHLER bei „%“: %', was, sqlerrm;
  end;
  raise exception 'KEIN FEHLER, obwohl erwartet: %', was;
end $$;
grant execute on function erwarte_fehler(text, text, text) to authenticated;

insert into auth.users (id, email) values
  ('d3333333-0000-0000-0000-000000000001', 'privat-mara@example.com'),
  ('d3333333-0000-0000-0000-000000000002', 'privat-jan@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'd3333333-0000-0000-0000-000000000001', false);
select public.create_household('Mara und Jan', 'Mara') as hhp \gset
select public.create_invite_link('erwachsener') as tokp \gset
select public.sync_entries('[
  {"id":"pz-alle","typ":"pinnwand","raum":"familie","geaendert":"2026-10-28T08:00:00Z","data":{"id":"pz-alle","typ":"pinnwand","data":{"text":"Milch ist alle","privat":false,"sort":-5,"groesse":"gross"}}},
  {"id":"pz-privat","typ":"pinnwand","raum":"familie","geaendert":"2026-10-28T08:00:00Z","data":{"id":"pz-privat","typ":"pinnwand","data":{"text":"Geschenk für Jan","privat":true}}},
  {"id":"pz-foto","typ":"pinnwand","raum":"familie","geaendert":"2026-10-28T08:00:00Z","data":{"id":"pz-foto","typ":"pinnwand","data":{"text":"","privat":true,"foto":{"path":"PFAD","w":1,"h":1}}}},
  {"id":"pz-ich","typ":"pinnwand","raum":"ich","geaendert":"2026-10-28T08:00:00Z","data":{"id":"pz-ich","typ":"pinnwand","raum":"ich","data":{"text":"Nur in meinem Raum"}}},
  {"id":"pz-arbeit","typ":"pinnwand","raum":"arbeit","geaendert":"2026-10-28T08:00:00Z","data":{"id":"pz-arbeit","typ":"pinnwand","raum":"arbeit","data":{"text":"Lieferant"}}}
]');
update public.entries set data = jsonb_set(data, '{data,foto,path}', to_jsonb((:'hhp' || '/pz-foto.jpg')::text)) where id = 'pz-foto';
insert into storage.objects (bucket_id, name) values ('fotos', :'hhp' || '/pz-foto.jpg'), ('fotos', :'hhp' || '/pz-alle.jpg');
select pruefe((select count(*) from public.entries where id like 'pz-%') = 5, 'Mara sieht alle ihre Zettel (auch die privaten, „ich“ und „arbeit“)');
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos' and name like :'hhp' || '/pz-%') = 2, 'Mara sieht beide Bilder');
select pruefe((select data -> 'data' ->> 'sort' from public.entries where id = 'pz-alle') = '-5', 'Platz (sort) kommt im Haushalt an');

select set_config('request.jwt.claim.sub', 'd3333333-0000-0000-0000-000000000002', false);
select public.join_by_link(:'tokp', 'Jan');
select pruefe((select count(*) from public.entries where id = 'pz-alle') = 1, 'Jan sieht den Zettel für alle');
select pruefe((select data -> 'data' ->> 'groesse' from public.entries where id = 'pz-alle') = 'gross', 'Größe kommt beim Partner an');
select pruefe((select count(*) from public.entries where id in ('pz-privat', 'pz-foto')) = 0, 'Jan sieht Maras „Nur für mich“-Zettel nicht');
select pruefe((select count(*) from public.entries where id in ('pz-ich', 'pz-arbeit')) = 0, 'Jan sieht Maras Zettel in „ich“ und „arbeit“ nicht (nur der Besitzer)');
-- Maras Zettel für alle auf „ich“ stellen (er wäre für Mara weg): übersprungen
select pruefe((public.sync_entries('[{"id":"pz-alle","typ":"pinnwand","raum":"ich","geaendert":"2030-01-01T00:00:00Z","data":{"data":{"text":"weg"}}}]') -> 'skipped') ? 'pz-alle', 'Jan stellt Maras Zettel nicht auf „ich“');
select pruefe((select count(*) from storage.objects where name = :'hhp' || '/pz-foto.jpg') = 0, 'Jan sieht das Bild des privaten Zettels nicht');
select pruefe((select count(*) from storage.objects where name = :'hhp' || '/pz-alle.jpg') = 1, 'Jan sieht andere Bilder des Haushalts');
delete from storage.objects where name = :'hhp' || '/pz-foto.jpg';
-- ändern geht nicht (unsichtbar), überschreiben per Abgleich auch nicht
update public.entries set data = '{"data":{"text":"weg","privat":false}}' where id = 'pz-privat';
select public.sync_entries('[{"id":"pz-privat","typ":"pinnwand","raum":"familie","geaendert":"2030-01-01T00:00:00Z","data":{"data":{"text":"gekapert","privat":false}}}]');
-- fremden Zettel privat machen (er wäre für Mara weg): abgelehnt
select erwarte_fehler($$update public.entries set data = '{"data":{"text":"Milch ist alle","privat":true}}' where id = 'pz-alle'$$, 'row-level security', 'Jan macht Maras Zettel privat');
-- eigener privater Zettel geht
select public.sync_entries('[{"id":"pz-jan","typ":"pinnwand","raum":"familie","geaendert":"2026-10-28T09:00:00Z","data":{"data":{"text":"Nur meins","privat":true}}}]');
select pruefe((select count(*) from public.entries where id = 'pz-jan') = 1, 'Jan sieht seinen eigenen privaten Zettel');

select set_config('request.jwt.claim.sub', 'd3333333-0000-0000-0000-000000000001', false);
select pruefe((select data -> 'data' ->> 'text' from public.entries where id = 'pz-privat') = 'Geschenk für Jan', 'Maras privater Zettel unverändert');
select pruefe((select count(*) from storage.objects where name = :'hhp' || '/pz-foto.jpg') = 1, 'Bild des privaten Zettels nicht von Jan gelöscht');
select pruefe((select data -> 'data' ->> 'privat' from public.entries where id = 'pz-alle') = 'false', 'Zettel für alle blieb für alle');
select pruefe((select count(*) from public.entries where id = 'pz-jan') = 0, 'Mara sieht Jans privaten Zettel nicht');
select pruefe((select raum from public.entries where id = 'pz-alle') = 'familie', 'Zettel für alle blieb Familie');
-- Mara macht ihren Zettel für alle sichtbar → Jan sieht ihn
select public.sync_entries('[{"id":"pz-privat","typ":"pinnwand","raum":"familie","geaendert":"2026-10-28T10:00:00Z","data":{"id":"pz-privat","typ":"pinnwand","data":{"text":"Geschenk für Jan","privat":false}}}]');
select set_config('request.jwt.claim.sub', 'd3333333-0000-0000-0000-000000000002', false);
select pruefe((select count(*) from public.entries where id = 'pz-privat') = 1, 'für alle sichtbar gemacht: Jan sieht ihn jetzt');

reset role;

-- Durchatmen-Ansagen (A-051): Bucket öffentlich lesbar, schreiben nur der Server (service_role)
grant execute on function erwarte_fehler(text, text, text) to anon;
insert into storage.objects (bucket_id, name) values ('durchatmen-ansagen', 'manifest.json'), ('durchatmen-ansagen', 'ein-0-abc12345.mp3');
select pruefe((select public from storage.buckets where id = 'durchatmen-ansagen') = true, 'Bucket durchatmen-ansagen ist öffentlich');
set role anon;
select pruefe((select count(*) from storage.objects where bucket_id = 'durchatmen-ansagen') = 2, 'anon liest die Ansagen');
select erwarte_fehler($$insert into storage.objects (bucket_id, name) values ('durchatmen-ansagen', 'boese.mp3')$$, 'row-level security', 'anon legt keine Ansage ab');
delete from storage.objects where bucket_id = 'durchatmen-ansagen';
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-0000-0000-0000-000000000001', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'durchatmen-ansagen') = 2, 'Angemeldete lesen die Ansagen');
select erwarte_fehler($$insert into storage.objects (bucket_id, name) values ('durchatmen-ansagen', 'boese.mp3')$$, 'row-level security', 'Angemeldete legen keine Ansage ab');
update storage.objects set name = 'weg.mp3' where bucket_id = 'durchatmen-ansagen';
delete from storage.objects where bucket_id = 'durchatmen-ansagen';
reset role;
select pruefe((select count(*) from storage.objects where bucket_id = 'durchatmen-ansagen' and name in ('manifest.json', 'ein-0-abc12345.mp3')) = 2, 'niemand außer dem Server ändert oder löscht Ansagen');
-- Andere Buckets bleiben zu: die Lese-Regel gilt nur für diesen Bucket
select pruefe((select count(*) from pg_policies where schemaname = 'storage' and policyname = 'durchatmen_ansagen_lesen' and qual like '%durchatmen-ansagen%') = 1, 'Lese-Regel nur für durchatmen-ansagen');

-- 8) Wundertüte und Rätsel (A-052): „gesehen“ teilt der Haushalt über `entries`
--    (keine neue Tabelle, Typen `wundertuete-gesehen`/`-karte`,
--    `raetsel-gesehen`/`-karte`, Raum Familie).
--    Alle im eigenen Haushalt sehen es, ein fremder Haushalt nie.
insert into auth.users (id, email) values
  ('d4444444-0000-0000-0000-000000000001', 'wt-felix@example.com'),
  ('d4444444-0000-0000-0000-000000000002', 'wt-lisa@example.com'),
  ('d4444444-0000-0000-0000-000000000003', 'wt-fremd@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'd4444444-0000-0000-0000-000000000001', false);
select public.create_household('Familie Tüte', 'Felix');
select public.create_invite_link('erwachsener') as tokw \gset
select pruefe((public.sync_entries('[
  {"id":"wt:g:aw-001","typ":"wundertuete-gesehen","raum":"familie","geaendert":"2026-11-02T07:00:00Z","data":{"id":"aw-001"}},
  {"id":"rt:g:ra-001","typ":"raetsel-gesehen","raum":"familie","geaendert":"2026-11-02T07:00:00Z","data":{"id":"ra-001"}},
  {"id":"wt:k:ki-abc-0001","typ":"wundertuete-karte","raum":"familie","geaendert":"2026-11-02T07:00:00Z","data":{"id":"ki-abc-0001","sorte":"witz","vorne":"Ein Witz."}}
]') ->> 'ok')::int = 3, 'Felix teilt Gesehenes (Wundertüte, Rätsel) und Mias eigene Karte');

select set_config('request.jwt.claim.sub', 'd4444444-0000-0000-0000-000000000002', false);
select public.join_by_link(:'tokw', 'Lisa');
select pruefe((select count(*) from public.entries where id like 'wt:%' or id like 'rt:%') = 3, 'Lisa sieht, was der Haushalt schon gesehen hat (auch Rätsel)');

select set_config('request.jwt.claim.sub', 'd4444444-0000-0000-0000-000000000003', false);
select public.create_household('Familie Fremd 2', 'Fremd');
select pruefe((select count(*) from public.entries where typ like 'wundertuete-%' or typ like 'raetsel-%') = 0, 'fremder Haushalt sieht keine Wundertüte- oder Rätsel-Zeilen');

-- 8) „Was los?“ (A-055): Veranstaltungen lesen alle (auch ohne Konto), schreiben
--    nur der Server (service role); kein Personenbezug in der Tabelle.
create or replace function erwarte_fehler_region(stmt text, was text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege then return;
  end;
  raise exception 'KEIN FEHLER, obwohl erwartet: %', was;
end $$;
grant execute on function erwarte_fehler_region(text, text) to anon, authenticated;

set role service_role;
insert into public.region_events (id, titel, datum, letzter_tag, beginn, ort, gemeinde, link, kategorien)
  values ('kreisoh-1', 'Nachtwächter-Rundgang', '2026-10-31', '2026-10-31', '17:00', 'Markt 19, Eutin', 'Eutin', 'https://www.kreis-oh.de/x', '{draussen,kultur}');
insert into public.region_status (id, treffer, grund) values (1, 1, 'ok') on conflict (id) do update set treffer = excluded.treffer;
select pruefe((select count(*) from public.region_events where id = 'kreisoh-1') = 1, 'Server schreibt region_events');
reset role;

set role anon;
select pruefe((select titel from public.region_events where id = 'kreisoh-1') = 'Nachtwächter-Rundgang', 'ohne Konto: Veranstaltungen lesbar');
select pruefe((select treffer from public.region_status where id = 1) = 1, 'ohne Konto: Status lesbar');
select erwarte_fehler_region($$insert into public.region_events (id, titel, datum, letzter_tag) values ('kreisoh-2', 'Fremd', '2026-11-01', '2026-11-01')$$, 'anon schreibt nicht');
select erwarte_fehler_region($$update public.region_events set titel = 'weg' where id = 'kreisoh-1'$$, 'anon ändert nicht');
select erwarte_fehler_region($$delete from public.region_events where id = 'kreisoh-1'$$, 'anon löscht nicht');
select erwarte_fehler_region($$update public.region_status set treffer = 99$$, 'anon ändert den Status nicht');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-0000-0000-0000-000000000001', false);
select pruefe((select count(*) from public.region_events where id = 'kreisoh-1') = 1, 'angemeldet: Veranstaltungen lesbar');
select erwarte_fehler_region($$insert into public.region_events (id, titel, datum, letzter_tag) values ('kreisoh-3', 'Fremd', '2026-11-01', '2026-11-01')$$, 'angemeldet schreibt nicht');
select erwarte_fehler_region($$delete from public.region_events$$, 'angemeldet löscht nicht');
reset role;

-- Ungültiges lehnt die Tabelle selbst ab (auch für den Server)
set role service_role;
select erwarte_fehler($$insert into public.region_events (id, titel, datum, letzter_tag, link) values ('kreisoh-4', 'X', '2026-11-01', '2026-11-01', 'javascript:alert(1)')$$, 'check constraint', 'nur https-Links');
select erwarte_fehler($$insert into public.region_events (id, titel, datum, letzter_tag, kategorien) values ('kreisoh-5', 'X', '2026-11-01', '2026-11-01', '{werbung}')$$, 'check constraint', 'nur bekannte Kategorien');
delete from public.region_events where id = 'kreisoh-1';
reset role;
