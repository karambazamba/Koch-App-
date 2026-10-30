-- Web Push: Abos nur eigene (anlegen, sehen, löschen), nur im eigenen
-- Haushalt; Schlüssel (push_config) und Versand-Liste sieht nie jemand außer
-- der Service-Rolle.

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
  ('a7777777-1111-1111-1111-111111111111', 'push-anna@example.com'),
  ('b8888888-2222-2222-2222-222222222222', 'push-ben@example.com');
insert into public.push_config (vapid_public, vapid_private, cron_token) values ('pub', 'geheim', 'zeichen');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a7777777-1111-1111-1111-111111111111', false);
select public.create_household('Push-Test', 'Anna') as hh \gset
select set_config('request.jwt.claim.sub', 'b8888888-2222-2222-2222-222222222222', false);
select public.create_household('Anderer', 'Ben') as hh2 \gset

-- Anna legt ihr Abo an
select set_config('request.jwt.claim.sub', 'a7777777-1111-1111-1111-111111111111', false);
insert into public.push_abos (household_id, endpoint, p256dh, auth) values (:'hh', 'https://push.example.com/anna', 'p256dh-schluessel', 'auth-geheim');
select pruefe((select count(*) from public.push_abos) = 1, 'Anna sieht ihr Abo');
select erwarte_fehler(format('insert into public.push_abos (household_id, endpoint, p256dh, auth) values (%L, %L, %L, %L)', :'hh2', 'https://push.example.com/x', 'p256dh-schluessel', 'auth-geheim'), 'row-level security', 'Abo in fremden Haushalt');
select erwarte_fehler('insert into public.push_abos (endpoint, p256dh, auth) values (''http://unsicher'', ''p256dh-schluessel'', ''auth-geheim'')', 'check', 'nur https');
select erwarte_fehler('select * from public.push_config', 'permission denied', 'Schlüssel nie für Angemeldete');
select erwarte_fehler('select * from public.push_gesendet', 'permission denied', 'Versand-Liste nie für Angemeldete');
-- A-069: Läufe, Protokoll, Tests und Status nur für die Service-Rolle
select erwarte_fehler('select * from public.push_laeufe', 'permission denied', 'Läufe nie für Angemeldete');
select erwarte_fehler('select * from public.push_protokoll', 'permission denied', 'Protokoll nie für Angemeldete');
select erwarte_fehler('select * from public.push_tests', 'permission denied', 'Test-Erinnerungen nie für Angemeldete');
select erwarte_fehler('select public.push_cron_status()', 'permission denied', 'Zeitplan-Status nie für Angemeldete');

-- Ben sieht Annas Abo nicht und kann es nicht löschen
select set_config('request.jwt.claim.sub', 'b8888888-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.push_abos) = 0, 'Ben sieht fremde Abos nicht');
delete from public.push_abos;
select set_config('request.jwt.claim.sub', 'a7777777-1111-1111-1111-111111111111', false);
select pruefe((select count(*) from public.push_abos) = 1, 'fremdes Löschen ohne Wirkung');
update public.push_abos set settings = '{"kinds":{"pinnwand":false}}';
select pruefe((select settings -> 'kinds' ->> 'pinnwand' from public.push_abos) = 'false', 'eigene Einstellungen ändern');
delete from public.push_abos;
select pruefe((select count(*) from public.push_abos) = 0, 'eigenes Abo löschen');

reset role;
set role anon;
select erwarte_fehler('select * from public.push_abos', 'permission denied', 'anon sieht keine Abos');
select erwarte_fehler('select * from public.push_config', 'permission denied', 'anon sieht keine Schlüssel');
select erwarte_fehler('select * from public.push_protokoll', 'permission denied', 'anon sieht kein Protokoll');
reset role;
select pruefe((public.push_cron_status() ->> 'ziel') is not null, 'Status für die Service-Rolle lesbar');
