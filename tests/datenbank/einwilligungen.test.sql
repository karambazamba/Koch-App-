-- Einwilligungen: jede Person schreibt und liest nur ihre eigenen, nichts für anon.

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
  ('e1111111-0000-0000-0000-000000000001', 'einw-a@example.com'),
  ('e1111111-0000-0000-0000-000000000002', 'einw-b@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'e1111111-0000-0000-0000-000000000001', false);
insert into public.einwilligungen (art, version, ja) values ('bedingungen', 1, true), ('ki', 1, true), ('ki', 1, false);
select pruefe((select count(*) from public.einwilligungen) = 3, 'eigene Einwilligungen sichtbar');
select pruefe((select ja from public.einwilligungen where art = 'ki' order by id desc limit 1) = false, 'Widerruf als neue Zeile');
select erwarte_fehler($$insert into public.einwilligungen (user_id, art, version, ja) values ('e1111111-0000-0000-0000-000000000002', 'ki', 1, true)$$, 'row-level security', 'nicht für andere schreiben');
select erwarte_fehler($$update public.einwilligungen set ja = true$$, 'permission denied', 'nichts nachträglich ändern');

select set_config('request.jwt.claim.sub', 'e1111111-0000-0000-0000-000000000002', false);
select pruefe((select count(*) from public.einwilligungen) = 0, 'fremde Einwilligungen unsichtbar');
reset role;

set role anon;
select erwarte_fehler($$select * from public.einwilligungen$$, 'permission denied', 'anon liest nichts');
reset role;
