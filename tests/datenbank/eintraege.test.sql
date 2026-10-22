-- Gemeinsame Einträge: Haushalt sieht Familie, „Arbeit“ nur der Besitzer,
-- Fremde sehen nichts, neueste Änderung gewinnt, Löschen nur als Markierung,
-- Verlassen nimmt „Arbeit“ mit.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
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
grant execute on function pruefe(boolean, text), erwarte_fehler(text, text, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'anna@example.com'),
  ('b2222222-2222-2222-2222-222222222222', 'ben@example.com'),
  ('c3333333-3333-3333-3333-333333333333', 'clara@example.com');

set role authenticated;
-- Anna legt an, Ben tritt bei; Clara hat einen eigenen Haushalt
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select public.create_household('Anna und Ben', 'Anna') as hh \gset
select public.create_invite() as code \gset
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((public.join_household(:'code', 'Ben') ->> 'household_id') = :'hh', 'Ben tritt bei');
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', false);
select public.create_household('Clara') as hh2 \gset

-- Anna lädt hoch: Familie-Termin, Arbeit-Termin
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((public.sync_entries('[
  {"id":"t1","typ":"termin","raum":"familie","geaendert":"2026-10-20T08:00:00Z","data":{"title":"Kita"}},
  {"id":"w1","typ":"termin","raum":"arbeit","geaendert":"2026-10-20T08:00:00Z","data":{"title":"Kunde"}}
]') ->> 'ok')::int = 2, 'Anna lädt zwei Einträge hoch');
select pruefe((select count(*) from public.entries) = 2, 'Anna sieht beide');
select pruefe((select besitzer from public.entries where id = 't1') = auth.uid(), 'Besitzer = Anna');

-- Ben sieht Familie, nicht Annas Arbeit
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.entries) = 1, 'Ben sieht nur Familie');
select pruefe((select data ->> 'title' from public.entries where id = 't1') = 'Kita', 'Ben sieht den Kita-Termin');
-- Ben ändert Annas Arbeit-Termin nicht (abgelehnt, die anderen laufen weiter)
select pruefe((public.sync_entries('[
  {"id":"w1","typ":"termin","raum":"arbeit","geaendert":"2026-10-21T08:00:00Z","data":{"title":"Gehackt"}},
  {"id":"t2","typ":"aufgabe","raum":"familie","geaendert":"2026-10-21T08:00:00Z","data":{"title":"Müll"}}
]') -> 'skipped') ? 'w1', 'Bens Änderung an Annas Arbeit abgelehnt');
select pruefe((select count(*) from public.entries where id = 't2') = 1, 'Bens Aufgabe kommt trotzdem an');
-- Familie-Eintrag zu Arbeit machen geht nur für den Besitzer
select pruefe((public.sync_entries('[{"id":"t1","typ":"termin","raum":"arbeit","geaendert":"2026-10-22T08:00:00Z","data":{}}]') -> 'skipped') ? 't1', 'Ben macht Annas Termin nicht zu seiner Arbeit');

-- Neueste Änderung gewinnt
select public.sync_entries('[{"id":"t1","typ":"termin","raum":"familie","geaendert":"2026-10-21T09:00:00Z","data":{"title":"Kita 9 Uhr"}}]');
select public.sync_entries('[{"id":"t1","typ":"termin","raum":"familie","geaendert":"2026-10-21T07:00:00Z","data":{"title":"alt"}}]');
select pruefe((select data ->> 'title' from public.entries where id = 't1') = 'Kita 9 Uhr', 'ältere Änderung verliert');
select pruefe((select besitzer from public.entries where id = 't1') = 'a1111111-1111-1111-1111-111111111111', 'Besitzer bleibt Anna');
select max(rev) as rev1 from public.entries \gset
-- Löschen als Markierung
select public.sync_entries('[{"id":"t1","typ":"termin","raum":"familie","geaendert":"2026-10-21T10:00:00Z","geloescht":true,"data":{}}]');
select pruefe((select geloescht from public.entries where id = 't1'), 'gelöscht ist nur markiert');
select pruefe((select rev from public.entries where id = 't1') > :rev1, 'rev steigt (zum Nachladen)');
select erwarte_fehler('delete from public.entries', 'permission denied', 'hartes Löschen verboten');
select erwarte_fehler('update public.entries set besitzer = auth.uid()', 'permission denied', 'Besitzer nicht änderbar');
select erwarte_fehler('update public.entries set rev = 1', 'permission denied', 'rev nicht änderbar');
select erwarte_fehler('insert into public.entries (household_id, id, typ, besitzer, data) values (''' || :'hh2' || ''', ''x'', ''termin'', auth.uid(), ''{}'')', 'row-level security', 'in fremden Haushalt schreiben');

-- Clara sieht nichts aus dem fremden Haushalt
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from public.entries) = 0, 'Clara sieht nichts');
select public.sync_entries('[{"id":"t2","typ":"aufgabe","raum":"familie","geaendert":"2030-01-01T00:00:00Z","data":{"title":"Clara"}}]');
reset role;
select pruefe((select data ->> 'title' from public.entries where household_id = :'hh' and id = 't2') = 'Müll', 'Claras gleiche ID landet in ihrem Haushalt, nicht bei Anna');
select pruefe((select count(*) from public.entries where household_id = :'hh2') = 1, 'Claras Eintrag in ihrem Haushalt');

-- Gäste: nichts
set role anon;
select erwarte_fehler('select * from public.entries', 'permission denied', 'Gast liest Einträge');
select erwarte_fehler('select public.sync_entries(''[]'')', 'permission denied', 'Gast lädt hoch');
reset role;

-- Anna verlässt den Haushalt: ihre Arbeit geht mit, Familie bleibt
set role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select public.leave_household();
reset role;
select pruefe((select count(*) from public.entries where household_id = :'hh' and id = 'w1') = 0, 'Annas Arbeit ist weg');
select pruefe((select count(*) from public.entries where household_id = :'hh' and raum = 'familie') = 2, 'Familien-Einträge bleiben');
delete from auth.users where id in ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333');
select pruefe((select count(*) from public.entries) = 0, 'leere Haushalte räumen ihre Einträge mit weg');
