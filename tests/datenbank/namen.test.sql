-- Namen statt Mail-Adresse (A-042): die einmalige Bereinigung alter Konten
-- (Anzeigename aus der Mail → bereinigter Teil vor dem @, „Familie <mail>“ →
-- leer = Standard in der App) – und dass die App dafür nur die vorhandenen
-- Rechte braucht (eigener Name, Haushalt nur Erwachsene).

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
grant execute on function pruefe(boolean, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('a7111111-0000-0000-0000-000000000001', 'felix.gabriel92@example.com'),
  ('a7111111-0000-0000-0000-000000000002', 'lisa.namen@example.com'),
  ('a7111111-0000-0000-0000-000000000003', 'mathis_k@example.com'),
  ('a7111111-0000-0000-0000-000000000004', 'ana-namen@example.com');

-- Alte Stände wie vor A-042 (direkt, ohne RLS)
insert into public.households (id, name) values
  ('a7222222-0000-0000-0000-000000000001', 'Familie felix.gabriel92'),
  ('a7222222-0000-0000-0000-000000000002', 'Familie Sonnenschein');
insert into public.members (household_id, user_id, display_name, role) values
  ('a7222222-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000001', 'felix.gabriel92', 'erwachsener'),
  ('a7222222-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000002', 'Lisa', 'erwachsener'),
  ('a7222222-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000003', 'mathis_k@example.com', 'kind'),
  ('a7222222-0000-0000-0000-000000000002', 'a7111111-0000-0000-0000-000000000004', 'Ana', 'erwachsener');
insert into public.invite_links (token_hash, household_id, created_by, inviter_name, expires_at) values
  ('namen-test', 'a7222222-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000001', 'felix.gabriel92', now() + interval '14 days');

select public.namen_ohne_mail();

select pruefe(public.name_aus_mail('felix.gabriel92@example.com') = 'Felix Gabriel', 'Vorschlag aus der Mail');
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000001') = 'Felix Gabriel', 'Teil vor dem @ → Felix Gabriel');
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000003') = 'Mathis K', 'ganze Mail → Mathis K');
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000002') = 'Lisa', 'echter Name bleibt');
select pruefe((select name from public.households where id = 'a7222222-0000-0000-0000-000000000001') = '', '„Familie <mail>“ → Standard (leer)');
select pruefe((select name from public.households where id = 'a7222222-0000-0000-0000-000000000002') = 'Familie Sonnenschein', 'echter Haushaltsname bleibt');
select pruefe((select inviter_name from public.invite_links where token_hash = 'namen-test') = 'Felix Gabriel', 'Einladung zeigt den Namen');

-- Zweimal schadet nicht
select public.namen_ohne_mail();
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000001') = 'Felix Gabriel', 'wiederholbar');

-- Die App kommt an die Bereinigung nicht heran
select pruefe(not has_function_privilege('authenticated', 'public.namen_ohne_mail()', 'execute'), 'authenticated darf die Bereinigung nicht aufrufen');
select pruefe(not has_function_privilege('anon', 'public.namen_ohne_mail()', 'execute'), 'anon darf die Bereinigung nicht aufrufen');

-- Beim Anmelden: eigener Name ja, Haushalt nur Erwachsene, fremde Namen nie
set role authenticated;
select set_config('request.jwt.claim.sub', 'a7111111-0000-0000-0000-000000000001', false);
update public.members set display_name = 'Felix' where user_id = 'a7111111-0000-0000-0000-000000000001';
update public.households set name = 'Familie Gabriel' where id = 'a7222222-0000-0000-0000-000000000001';
update public.members set display_name = 'Fremd' where user_id = 'a7111111-0000-0000-0000-000000000002';
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000001') = 'Felix', 'eigener Name geändert');
select pruefe((select display_name from public.members where user_id = 'a7111111-0000-0000-0000-000000000002') = 'Lisa', 'fremder Name bleibt');
select pruefe((select name from public.households where id = 'a7222222-0000-0000-0000-000000000001') = 'Familie Gabriel', 'Erwachsene benennen um');

select set_config('request.jwt.claim.sub', 'a7111111-0000-0000-0000-000000000003', false);
update public.households set name = 'Kinderzimmer' where id = 'a7222222-0000-0000-0000-000000000001';
select pruefe((select name from public.households where id = 'a7222222-0000-0000-0000-000000000001') = 'Familie Gabriel', 'Kind benennt nicht um');

reset role;
