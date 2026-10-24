-- Mails an Mia: Familie sieht Familien-Vorschläge, Arbeit nur die Person,
-- Fremde nichts; Adresse anlegen/ändern; nur der Server schreibt Vorschläge.

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
  ('a5555555-5555-5555-5555-555555555555', 'mona-mail@example.com'),
  ('b6666666-6666-6666-6666-666666666666', 'tom-mail@example.com'),
  ('c7777777-7777-7777-7777-777777777777', 'fremd-mail@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a5555555-5555-5555-5555-555555555555', false);
select public.create_household('Familie Groß', 'Mona') as hh \gset
select public.mail_address('familie') as fam \gset
select pruefe(:'fam' ~ '^familie-gross-[0-9a-f]{4}$', 'Familien-Adresse familie-gross-xxxx');
select pruefe(public.mail_address('familie') = :'fam', 'zweites Mal: dieselbe Adresse');
select public.mail_address('arbeit') as arb \gset
select pruefe(:'arb' ~ '^mona-arbeit-[0-9a-f]{4}$', 'Arbeits-Adresse mona-arbeit-xxxx');
select public.mail_address('familie', true) as neu \gset
select pruefe(:'neu' <> :'fam', 'Adresse ändern: neue Adresse');
select pruefe((select count(*) from public.mail_addresses where active and room = 'familie') = 1, 'nur eine aktive Familien-Adresse');
select erwarte_fehler('insert into public.mail_items (household_id, room) values (public.my_household(), ''familie'')', 'permission denied', 'Vorschläge schreibt nur der Server');
select public.create_invite_link() as token \gset

select set_config('request.jwt.claim.sub', 'b6666666-6666-6666-6666-666666666666', false);
select public.join_by_link(:'token', 'Tom');

-- Server schreibt (geheimer Schlüssel = ohne Rolle)
reset role;
insert into public.mail_items (household_id, user_id, room, sender_domain, sender_key, subject, excerpt, vorschlaege) values
  (:'hh', null, 'familie', 'kita.de', 'kita.de', 'Laternenumzug', 'Am Freitag …', '[{"kind":"termin"}]'),
  (:'hh', 'a5555555-5555-5555-5555-555555555555', 'arbeit', 'firma.de', 'firma.de', 'Projekt', 'Montag …', '[]'),
  (:'hh', null, 'familie', 'alt.de', 'alt.de', 'Alt', '', '[]');
update public.mail_items set expires_at = now() - interval '1 minute' where subject = 'Alt';
insert into public.mail_senders (household_id, user_id, room, sender, count) values (:'hh', null, 'familie', 'kita.de', 2), (:'hh', 'a5555555-5555-5555-5555-555555555555', 'arbeit', 'firma.de', 3);
set role authenticated;

select set_config('request.jwt.claim.sub', 'b6666666-6666-6666-6666-666666666666', false);
select pruefe((select count(*) from public.mail_items) = 1, 'Tom sieht nur den Familien-Vorschlag (nicht Monas Arbeit, nicht Abgelaufenes)');
select pruefe((select count(*) from public.mail_addresses) = 1, 'Tom sieht nur die Familien-Adresse');
select pruefe((select count(*) from public.mail_senders) = 1, 'Tom sieht nur Familien-Absender');
select public.mail_sender_accepted('kita.de', 'familie');
select public.mail_sender_decide('kita.de', 'familie', 'ja');
select pruefe((select decision from public.mail_senders where sender = 'kita.de') = 'ja' and (select accepted from public.mail_senders where sender = 'kita.de') = 1, 'Entscheidung und Übernommen gemerkt');
select public.mail_sender_decide('firma.de', 'arbeit', 'nein');
select set_config('request.jwt.claim.sub', 'a5555555-5555-5555-5555-555555555555', false);
select pruefe((select decision from public.mail_senders where sender = 'firma.de') is null, 'Tom ändert Monas Arbeit-Absender nicht');
select pruefe((select count(*) from public.mail_items) = 2, 'Mona sieht Familie und ihre Arbeit');
delete from public.mail_items where subject = 'Laternenumzug';
select pruefe((select count(*) from public.mail_items) = 1, 'Verwerfen löscht');

select set_config('request.jwt.claim.sub', 'c7777777-7777-7777-7777-777777777777', false);
select pruefe((select count(*) from public.mail_items) = 0 and (select count(*) from public.mail_addresses) = 0 and (select count(*) from public.mail_senders) = 0, 'Fremd sieht nichts');
select erwarte_fehler('select public.mail_address(''familie'')', 'keine_familie', 'ohne Familie keine Adresse');
reset role;
