-- Haushalt, Einladen, Beitreten, Verlassen – und was fremde Konten NICHT dürfen.
-- Felix (A) legt an, Lisa (B) tritt bei, Mathis (K) kommt als Kind, Fremd (C)
-- gehört nicht dazu.

create function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
create function erwarte_fehler(stmt text, muster text, was text) returns void language plpgsql as $$
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
  ('11111111-1111-1111-1111-111111111111', 'felix@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'lisa@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'fremd@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'mathis@example.com');

-- Felix legt an und lädt ein
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.create_household('Müller', 'Felix', 'p-ich') as hh \gset
select pruefe((select count(*) from public.households) = 1, 'Felix sieht seinen Haushalt');
select erwarte_fehler('select public.create_household(''Zweiter'')', 'schon_im_haushalt', 'zweiter Haushalt');
select public.create_invite() as code \gset
select pruefe(:'code' ~ '^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$', 'Code im Format 4K7-P2Q');
select public.create_invite('kind') as kindcode \gset
select erwarte_fehler('select * from public.invites', 'permission denied', 'Einladungen nicht direkt lesbar');
select pruefe((select count(*) from public.households where name = 'Müller') = 1, 'Name gespeichert');
update public.households set region = 'Ostholstein' where id = :'hh';
select pruefe((select region from public.households where id = :'hh') = 'Ostholstein', 'Erwachsene ändern den Haushalt');

-- Lisa tritt bei (Code auch klein und ohne Strich)
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from public.households) = 0, 'vor dem Beitreten: nichts sichtbar');
select pruefe((public.join_household(lower(replace(:'code', '-', '')), 'Lisa') ->> 'household_id') = :'hh', 'Lisa tritt mit Code bei');
select pruefe((select count(*) from public.members) = 2, 'Lisa sieht beide Mitglieder');
select pruefe(public.my_household() = :'hh', 'my_household');

-- Mathis kommt als Kind und darf nicht einladen
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select pruefe((public.join_household(:'kindcode', 'Mathis') ->> 'household_id') = :'hh', 'Kind tritt bei');
select pruefe((select role from public.members where user_id = auth.uid()) = 'kind', 'Rolle Kind');
select erwarte_fehler('select public.create_invite()', 'darf_nicht_einladen', 'Kind lädt ein');
update public.households set name = 'Kinderhaus' where id = :'hh';
select erwarte_fehler('update public.members set role = ''erwachsener'' where user_id = auth.uid()', 'permission denied', 'Kind macht sich erwachsen');
reset role;
select pruefe((select name from public.households where id = :'hh') = 'Müller', 'Kind ändert den Haushalt nicht');
select pruefe((select role from public.members where user_id = '44444444-4444-4444-4444-444444444444') = 'kind', 'Kind macht sich nicht selbst erwachsen');
set role authenticated;

-- Fremd sieht nichts und kommt nicht hinein
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from public.households) = 0, 'Fremd sieht keinen Haushalt');
select pruefe((select count(*) from public.members) = 0, 'Fremd sieht keine Mitglieder');
select pruefe((select count(*) from public.profiles) = 0, 'Fremd sieht keine Profile');
update public.households set name = 'Gekapert' where id = :'hh';
select erwarte_fehler(format('insert into public.members (household_id, user_id) values (%L, auth.uid())', :'hh'), 'permission denied', 'Fremd trägt sich selbst ein');
select pruefe((public.join_household(:'code', 'Fremd') ->> 'error') = 'code_benutzt', 'benutzter Code geht nicht nochmal');
select pruefe((public.join_household('ZZZ-ZZZ') ->> 'error') = 'code_unbekannt', 'unbekannter Code');
select public.join_household('ZZZ-ZZ' || n) from generate_series(2, 9) n;
select pruefe((public.join_household(:'code') ->> 'error') = 'zu_viele_versuche', 'nach 10 Fehlversuchen: Pause');
reset role;
select pruefe((select name from public.households where id = :'hh') = 'Müller', 'Fremd ändert den Haushalt nicht');
select pruefe((select count(*) from public.invite_attempts where user_id = '33333333-3333-3333-3333-333333333333') = 10, 'Fehlversuche bleiben gemerkt');

-- Abgelaufener Code
delete from public.invite_attempts;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.create_invite() as altcode \gset
reset role;
update public.invites set expires_at = now() - interval '1 minute' where used_by is null;
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select pruefe((public.join_household(:'altcode') ->> 'error') = 'code_abgelaufen', 'abgelaufener Code');

-- Gäste (nicht angemeldet) bekommen nichts
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select erwarte_fehler('select * from public.households', 'permission denied', 'Gast liest Haushalte');
select erwarte_fehler('select public.create_household(''x'')', 'permission denied', 'Gast legt an');
reset role;

-- Profile: eigenes anlegen, im Haushalt sichtbar, fremdes nicht änderbar
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.profiles (user_id, display_name, helper) values (auth.uid(), 'Felix', '{"name":"Mia"}');
select erwarte_fehler('insert into public.profiles (user_id, display_name) values (''22222222-2222-2222-2222-222222222222'', ''x'')', 'row-level security', 'fremdes Profil anlegen');
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select pruefe((select display_name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111') = 'Felix', 'Lisa sieht Felix'' Profil');
update public.profiles set display_name = 'Gehackt' where user_id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from public.profiles) = 0, 'Fremd sieht Felix'' Profil nicht');
reset role;
select pruefe((select display_name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111') = 'Felix', 'Lisa ändert Felix'' Profil nicht');

-- Verlassen: der letzte macht das Licht aus; Konto löschen räumt mit auf
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.leave_household();
select pruefe((select count(*) from public.households) = 0, 'nach dem Verlassen nichts mehr sichtbar');
reset role;
select pruefe((select count(*) from public.households where id = :'hh') = 1, 'Haushalt bleibt, solange noch jemand da ist');
delete from auth.users where id = '44444444-4444-4444-4444-444444444444';
select pruefe((select count(*) from public.members where household_id = :'hh') = 1, 'gelöschtes Konto ist kein Mitglied mehr');
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select pruefe((select count(*) from public.households where id = :'hh') = 0, 'leerer Haushalt wird gelöscht');
select pruefe((select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111') = 0, 'Profil mit dem Konto gelöscht');
