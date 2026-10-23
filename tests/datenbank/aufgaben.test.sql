-- Aufgaben sind persönlich (Tafel 52 B): fremde Aufgaben unsichtbar,
-- abgegebene sichtbar und änderbar, zurückgeben geht, der Besitzer behält
-- sie immer; Termine bleiben gemeinsam. Seit 3b geteilte Aufgaben werden
-- privat, ohne dass etwas verloren geht.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
grant execute on function pruefe(boolean, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'anna@example.com'),
  ('b2222222-2222-2222-2222-222222222222', 'ben@example.com'),
  ('c3333333-3333-3333-3333-333333333333', 'clara@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select public.create_household('Familie', 'Anna') as hh \gset
select public.create_invite() as code \gset
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select public.join_household(:'code', 'Ben');
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select public.create_invite() as code2 \gset
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', false);
select public.join_household(:'code2', 'Clara');

-- Anna: eine eigene Aufgabe, eine für Ben, einen Familien-Termin
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((public.sync_entries('[
  {"id":"a1","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T08:00:00Z","data":{"title":"Steuer"}},
  {"id":"a2","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T08:00:00Z","data":{"title":"Turnbeutel waschen","fuer":"b2222222-2222-2222-2222-222222222222"}},
  {"id":"t1","typ":"termin","raum":"familie","geaendert":"2026-10-24T08:00:00Z","data":{"title":"Elternabend"}}
]') ->> 'ok')::int = 3, 'Anna lädt hoch');
select pruefe((select count(*) from public.entries) = 3, 'Anna sieht alles von sich');

-- Ben: sieht den Termin und die ihm gegebene Aufgabe, nicht Annas eigene
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.entries where id = 'a1') = 0, 'fremde Aufgabe unsichtbar');
select pruefe((select count(*) from public.entries where id = 'a2') = 1, 'abgegebene Aufgabe sichtbar');
select pruefe((select count(*) from public.entries where id = 't1') = 1, 'Termin bleibt gemeinsam');
-- Ben hakt ab (darf ändern), Annas eigene kann er nicht anfassen
select pruefe((public.sync_entries('[
  {"id":"a2","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T09:00:00Z","data":{"title":"Turnbeutel waschen","fuer":"b2222222-2222-2222-2222-222222222222","doneOn":"2026-10-24"}},
  {"id":"a1","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T09:00:00Z","data":{"title":"Gehackt"}}
]') -> 'skipped') ? 'a1', 'Annas eigene Aufgabe bleibt unangetastet');
-- Bens eigene Aufgabe sieht Anna nicht
select public.sync_entries('[{"id":"b1","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T09:00:00Z","data":{"title":"Fahrrad"}}]');

-- Clara sieht keine der Aufgaben, aber den Termin
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from public.entries where typ = 'aufgabe') = 0, 'Clara sieht keine fremden Aufgaben');
select pruefe((select count(*) from public.entries where id = 't1') = 1, 'Clara sieht den Termin');

-- Anna sieht Bens Haken an der abgegebenen Aufgabe, nicht Bens eigene
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((select data ->> 'doneOn' from public.entries where id = 'a2') = '2026-10-24', 'Absender sieht „erledigt“');
select pruefe((select count(*) from public.entries where id = 'b1') = 0, 'Anna sieht Bens eigene Aufgabe nicht');

-- Ben gibt zurück („Passt gerade nicht“): danach sieht er sie nicht mehr, Anna schon
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((public.sync_entries('[{"id":"a2","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T10:00:00Z","data":{"title":"Turnbeutel waschen","zurueck":"b2222222-2222-2222-2222-222222222222"}}]') -> 'skipped') = '[]'::jsonb, 'Ben gibt zurück');
select pruefe((select data ->> 'fuer' from public.entries where id = 'a2') is null, 'zurückgegeben: Ben hält sie nicht mehr (die App blendet sie aus)');
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', false);
select pruefe((select data ->> 'fuer' from public.entries where id = 'a2') is null, 'Anna hat sie wieder');
-- Anna gibt sie Clara: Ben verliert den Lesezugriff
select public.sync_entries('[{"id":"a2","typ":"aufgabe","raum":"familie","geaendert":"2026-10-24T11:00:00Z","data":{"title":"Turnbeutel waschen","fuer":"c3333333-3333-3333-3333-333333333333"}}]');
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.entries where id = 'a2') = 0, 'weitergegeben an Clara: für Ben weg');
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from public.entries where id = 'a2') = 1, 'Clara sieht sie');
reset role;

-- Nichts verloren: alle Aufgaben liegen noch beim Ersteller
select pruefe((select count(*) from public.entries where household_id = :'hh' and typ = 'aufgabe') = 3, 'alle Aufgaben bleiben erhalten');
select pruefe((select besitzer from public.entries where id = 'b1') = 'b2222222-2222-2222-2222-222222222222', 'Bens Aufgabe gehört Ben');
delete from auth.users where id in ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333');
