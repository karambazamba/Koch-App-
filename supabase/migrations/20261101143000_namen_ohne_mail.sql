-- Namen statt Mail-Adresse (A-042)
-- Früher wurde ohne Namen im Profil der Teil vor dem @ als Anzeigename und
-- „Familie <Teil vor dem @>“ als Haushaltsname gespeichert. Einmalig
-- bereinigen: Anzeigename → bereinigter Teil vor dem @ (ohne Punkte, Zahlen,
-- Unterstriche, großgeschrieben – dieselbe Regel wie `nameAusMail` in
-- src/lib/konten/namen.ts), Haushaltsname → leer (die App zeigt dann den
-- Standard je Haushaltsart und setzt ihn beim nächsten Anmelden, ebenso den
-- Namen aus dem Profil). Keine neue Spalte, keine neue Datenart, RLS und
-- Rechte bleiben unverändert. Wiederholbar: was schon bereinigt ist, passt
-- nicht mehr auf die Bedingungen.

create or replace function public.name_aus_mail(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(trim(initcap(regexp_replace(regexp_replace(regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[0-9]+', '', 'g'), '[._+]+', ' ', 'g'), '\s+', ' ', 'g'))), 40);
$$;

-- Alter Anzeigename aus der Mail: enthält @ oder ist genau der Teil vor dem @
create or replace function public.ist_mail_name(p_name text, p_email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_name, '') like '%@%'
      or (trim(coalesce(p_name, '')) <> '' and lower(trim(p_name)) = lower(split_part(coalesce(p_email, ''), '@', 1)));
$$;

create or replace function public.namen_ohne_mail()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Haushaltsname „Familie <mail…>“ bzw. mit @ → leer (Standard in der App)
  update public.households h set name = ''
  where h.name like '%@%'
     or exists (
       select 1 from public.members m join auth.users u on u.id = m.user_id
       where m.household_id = h.id and h.name ~* '^familie\s' and public.ist_mail_name(regexp_replace(h.name, '^[Ff]amilie\s+', ''), u.email)
     );

  -- Einladungen: Name der einladenden Person (vor den Mitgliedern, solange der alte Name noch passt)
  update public.invite_links l set inviter_name = public.name_aus_mail(coalesce(u.email, l.inviter_name))
  from auth.users u
  where u.id = l.created_by and public.ist_mail_name(l.inviter_name, u.email);
  update public.invite_links set inviter_name = public.name_aus_mail(inviter_name) where inviter_name like '%@%';

  -- Mitglieder und Profile
  update public.members m set display_name = public.name_aus_mail(coalesce(u.email, m.display_name))
  from auth.users u
  where u.id = m.user_id and public.ist_mail_name(m.display_name, u.email);
  update public.members set display_name = public.name_aus_mail(display_name) where display_name like '%@%';
  update public.profiles p set display_name = public.name_aus_mail(coalesce(u.email, p.display_name))
  from auth.users u
  where u.id = p.user_id and public.ist_mail_name(p.display_name, u.email);
end $$;

-- Nur für diese Migration (und den Datenbank-Test), nie für die App
revoke all on function public.namen_ohne_mail() from public, anon, authenticated;
revoke all on function public.name_aus_mail(text), public.ist_mail_name(text, text) from public, anon, authenticated;

select public.namen_ohne_mail();
