-- Einladen per Link (Tafel 22): Anja lädt ein, Ben kommt per Link (mehrfach
-- nutzbar), Kim war in einer anderen Familie und wechselt nur auf Wunsch,
-- Fremde sehen nichts, zurückgezogene und abgelaufene Links gehen nicht.

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
  ('55555555-5555-5555-5555-555555555555', 'anja-link@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'ben-link@example.com'),
  ('77777777-7777-7777-7777-777777777777', 'kim-link@example.com'),
  ('88888888-8888-8888-8888-888888888888', 'fremd-link@example.com'),
  ('99999999-9999-9999-9999-999999999999', 'kind-link@example.com');

set role authenticated;

-- Kim hat schon eine eigene Familie
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);
select public.create_household('Familie Kim', 'Kim') as kimhh \gset

-- Anja legt an und erzeugt einen Link
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
select public.create_household('Familie Berg', 'Anja') as hh \gset
select public.create_invite_link() as token \gset
select pruefe(:'token' ~ '^[0-9a-f]{32}$', 'Link-Token: 32 Zeichen');
select erwarte_fehler('select * from public.invite_links', 'permission denied', 'Links nicht direkt lesbar');
select pruefe((select count(*) from public.list_invite_links()) = 1, 'Anja sieht ihre offene Einladung');
select pruefe((select inviter_name from public.list_invite_links()) = 'Anja', 'mit ihrem Namen');

-- Vor dem Anmelden: nur Name und Familie
reset role;
set role anon;
select pruefe((public.invite_link_info(:'token') ->> 'inviter') = 'Anja', 'Einladungsseite: wer lädt ein');
select pruefe((public.invite_link_info(:'token') ->> 'family') = 'Familie Berg', 'Einladungsseite: Familie');
select pruefe((public.invite_link_info('falsch') ->> 'status') = 'unbekannt', 'falscher Link');
select erwarte_fehler('select public.join_by_link(''x'')', 'permission denied', 'ohne Konto kein Beitreten');
reset role;
set role authenticated;

-- Ben kommt per Link, der Link bleibt gültig (mehrfach nutzbar)
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
select pruefe((public.join_by_link(:'token', 'Ben') ->> 'household_id') = :'hh', 'Ben tritt per Link bei');
select pruefe((public.join_by_link(:'token', 'Ben') ->> 'household_id') = :'hh', 'nochmal: schon drin, kein Fehler');
select pruefe((select count(*) from public.members where household_id = :'hh') = 2, 'zwei in Familie Berg');

-- Kim: erst Rückfrage, dann Wechsel
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);
select pruefe((public.join_by_link(:'token', 'Kim') ->> 'error') = 'andere_familie', 'Kim ist schon in einer Familie');
select pruefe((public.join_by_link(:'token', 'Kim') ->> 'family') = 'Familie Kim', 'mit Namen der alten Familie');
select pruefe(public.my_household() = :'kimhh', 'ohne Wunsch bleibt Kim, wo sie ist');
select pruefe((public.join_by_link(:'token', 'Kim', null, true) ->> 'household_id') = :'hh', 'Kim wechselt auf Wunsch');
reset role;
select pruefe((select count(*) from public.households where id = :'kimhh') = 0, 'leere alte Familie ist weg');
select pruefe((select uses from public.invite_links where token_hash = public.invite_link_hash(:'token')) = 2, 'Link zweimal benutzt');
set role authenticated;

-- Fremd sieht nichts, kann nicht zurückziehen
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888888', false);
select pruefe((select count(*) from public.list_invite_links()) = 0, 'Fremd sieht keine Einladungen');
select erwarte_fehler('select public.revoke_invite_link(''abc'')', 'darf_nicht_einladen', 'Fremd zieht nichts zurück');
select erwarte_fehler('select public.create_invite_link()', 'darf_nicht_einladen', 'Fremd ohne Familie lädt nicht ein');

-- Kind-Link: Kind darf selbst nicht einladen
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
select public.create_invite_link('kind') as kindtoken \gset
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', false);
select pruefe((public.join_by_link(:'kindtoken', 'Kind') ->> 'household_id') = :'hh', 'Kind kommt per Kind-Link');
select pruefe((select role from public.members where user_id = auth.uid()) = 'kind', 'als Kind');
select erwarte_fehler('select public.create_invite_link()', 'darf_nicht_einladen', 'Kind lädt nicht ein');
select pruefe((select count(*) from public.list_invite_links()) = 0, 'Kind sieht keine Einladungen');

-- Zurückziehen: danach geht der Link nicht mehr
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
select public.revoke_invite_link(left(public.invite_link_hash(:'token'), 12));
select pruefe((select count(*) from public.list_invite_links()) = 1, 'nur noch der Kind-Link offen');
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888888', false);
select pruefe((public.join_by_link(:'token', 'Fremd') ->> 'error') = 'link_unbekannt', 'zurückgezogener Link geht nicht');

-- Abgelaufen
reset role;
update public.invite_links set expires_at = now() - interval '1 minute' where token_hash = public.invite_link_hash(:'kindtoken');
set role authenticated;
select pruefe((public.join_by_link(:'kindtoken', 'Fremd') ->> 'error') = 'link_abgelaufen', 'abgelaufener Link');
select pruefe((public.invite_link_info(:'kindtoken') ->> 'status') = 'abgelaufen', 'Einladungsseite: abgelaufen');
reset role;
