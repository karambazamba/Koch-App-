-- Raum „Ich“ (Tafel 114): nur der Besitzer sieht und ändert ihn – wie
-- „Arbeit“. Zwei Konten im selben Haushalt: Anna legt Familie, Ich und
-- Arbeit an, Ben sieht nur Familie. Unbekannte Räume lehnt die Tabelle ab.
-- Wer geht, nimmt „Ich“ mit.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
grant execute on function pruefe(boolean, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'anna@example.com'),
  ('b2222222-2222-2222-2222-222222222222', 'ben@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select public.create_household('Anna und Ben', 'Anna') as hh \gset
select public.create_invite() as code \gset
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select public.join_household(:'code', 'Ben');

-- Anna: Familie-Termin, Ich-Termin, Ich-Notiz, Arbeit-Termin, Ich-Aufgabe
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((public.sync_entries('[
  {"id":"f1","typ":"termin","raum":"familie","geaendert":"2026-11-01T08:00:00Z","data":{"title":"Kita"}},
  {"id":"i1","typ":"termin","raum":"ich","geaendert":"2026-11-01T08:00:00Z","data":{"title":"Therapie"}},
  {"id":"i2","typ":"notiz","raum":"ich","geaendert":"2026-11-01T08:00:00Z","data":{"title":"Tagebuch"}},
  {"id":"w1","typ":"termin","raum":"arbeit","geaendert":"2026-11-01T08:00:00Z","data":{"title":"Kunde"}},
  {"id":"a1","typ":"aufgabe","raum":"ich","geaendert":"2026-11-01T08:00:00Z","data":{"title":"Tim antworten"}}
]') ->> 'ok')::int = 5, 'Anna lädt fünf Einträge hoch (auch „ich“)');
select pruefe((select count(*) from public.entries) = 5, 'Anna sieht alle fünf');
select pruefe((select raum from public.entries where id = 'i1') = 'ich', 'Raum „ich“ bleibt „ich“');

-- Ben sieht nur Familie
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.entries) = 1, 'Ben sieht nur den Familien-Termin');
select pruefe((select count(*) from public.entries where raum = 'ich') = 0, 'Ben sieht nichts aus Annas „Ich“');
-- Ben überschreibt Annas Ich-Termin nicht und macht ihn auch nicht zu Familie
select pruefe((public.sync_entries('[{"id":"i1","typ":"termin","raum":"familie","geaendert":"2026-11-02T08:00:00Z","data":{"title":"Gehackt"}}]') -> 'skipped') ? 'i1', 'Bens Änderung an Annas „Ich“ abgelehnt');
-- Ben macht Annas Familien-Termin nicht zu seinem „Ich“
select pruefe((public.sync_entries('[{"id":"f1","typ":"termin","raum":"ich","geaendert":"2026-11-02T08:00:00Z","data":{"title":"Meins"}}]') -> 'skipped') ? 'f1', 'Ben macht Annas Termin nicht zu seinem „Ich“');
-- Bens eigenes „Ich“ sieht Anna nicht
select pruefe((public.sync_entries('[{"id":"b1","typ":"termin","raum":"ich","geaendert":"2026-11-02T08:00:00Z","data":{"title":"Laufen"}}]') ->> 'ok')::int = 1, 'Ben legt eigenes „Ich“ an');
-- Unbekannter Raum wird abgelehnt
select pruefe((public.sync_entries('[{"id":"x1","typ":"termin","raum":"privat","geaendert":"2026-11-02T08:00:00Z","data":{"title":"?"}}]') -> 'skipped') ? 'x1', 'unbekannter Raum abgelehnt');

select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((select count(*) from public.entries where id = 'b1') = 0, 'Anna sieht Bens „Ich“ nicht');
select pruefe((select data ->> 'title' from public.entries where id = 'i1') = 'Therapie', 'Annas „Ich“ ist unverändert');
select pruefe((select raum from public.entries where id = 'f1') = 'familie', 'Familie bleibt Familie');
-- Anna selbst darf ihren Ich-Termin zu Familie machen (teilen)
select pruefe((public.sync_entries('[{"id":"i2","typ":"notiz","raum":"familie","geaendert":"2026-11-03T08:00:00Z","data":{"title":"Tagebuch"}}]') ->> 'ok')::int = 1, 'Besitzerin teilt ihre Notiz');

-- Anna verlässt den Haushalt: „Ich“ und „Arbeit“ gehen mit, Familie bleibt
select public.leave_household();
reset role;
select pruefe((select count(*) from public.entries where household_id = :'hh' and besitzer = 'a1111111-1111-1111-1111-111111111111' and raum in ('ich', 'arbeit')) = 0, 'Annas „Ich“ und „Arbeit“ sind weg');
select pruefe((select count(*) from public.entries where household_id = :'hh' and raum = 'familie') = 2, 'Familien-Einträge bleiben (Kita, geteilte Notiz)');
select pruefe((select count(*) from public.entries where household_id = :'hh' and id = 'b1') = 1, 'Bens „Ich“ bleibt bei Ben');
delete from auth.users where id in ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222');
