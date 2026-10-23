-- mia_wuensche: niemand in der App liest oder schreibt (RLS an, keine
-- Policies, Rechte entzogen) – nur der Server mit dem geheimen Schlüssel.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
grant execute on function pruefe(boolean, text) to anon, authenticated;

insert into public.mia_wuensche (text) values ('Pizza bestellen');
select pruefe((select relrowsecurity from pg_class where relname = 'mia_wuensche'), 'RLS an');

set role authenticated;
do $$
begin
  perform count(*) from public.mia_wuensche;
  raise exception 'FEHLGESCHLAGEN: angemeldet kann lesen';
exception when insufficient_privilege then null;
end $$;
do $$
begin
  insert into public.mia_wuensche (text) values ('Oma anrufen');
  raise exception 'FEHLGESCHLAGEN: angemeldet kann schreiben';
exception when insufficient_privilege then null;
end $$;
reset role;
set role anon;
do $$
begin
  perform count(*) from public.mia_wuensche;
  raise exception 'FEHLGESCHLAGEN: anon kann lesen';
exception when insufficient_privilege then null;
end $$;
reset role;
