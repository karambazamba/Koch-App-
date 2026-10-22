-- Konten und gemeinsamer Haushalt (Etappe 3a)
-- Haushalte, Mitglieder, Einladungen (nur Hash des Codes), Profile.
-- Jede Tabelle mit Row Level Security: Zugriff nur für Mitglieder des eigenen
-- Haushalts. Anlegen, Einladen, Beitreten und Verlassen nur über Funktionen,
-- die selbst prüfen, wer aufruft (auth.uid()). Ein Konto gehört zu höchstens
-- einem Haushalt. Kinder dürfen nicht einladen.

-- Haushalte ------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 60),
  region text check (region is null or char_length(region) <= 60),
  created_at timestamptz not null default now()
);

-- Mitglieder (person_id = Person im Profil der App, z. B. „ich“) ---------------
create table if not exists public.members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id text check (person_id is null or char_length(person_id) <= 80),
  display_name text not null default '' check (char_length(display_name) <= 40),
  role text not null default 'erwachsener' check (role in ('erwachsener', 'kind')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

-- Einladungen: nur der Hash des Codes liegt hier ---------------------------------
create table if not exists public.invites (
  code_hash text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null default 'erwachsener' check (role in ('erwachsener', 'kind')),
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fehlversuche beim Beitreten (gegen Raten) -----------------------------------
create table if not exists public.invite_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists invite_attempts_user_at on public.invite_attempts (user_id, at);

-- Profile: Anzeigename und Begleitungs-Einstellungen pro Person ----------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  helper jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.invite_attempts enable row level security;
alter table public.profiles enable row level security;

-- Hilfen (security definer, damit die Policies sich nicht selbst abfragen) ------
create or replace function public.is_member(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members m where m.household_id = hh and m.user_id = auth.uid());
$$;

create or replace function public.my_household()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.household_id from public.members m where m.user_id = auth.uid();
$$;

create or replace function public.is_adult(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members m where m.household_id = hh and m.user_id = auth.uid() and m.role = 'erwachsener');
$$;

-- Policies ---------------------------------------------------------------------
drop policy if exists "Haushalt sehen" on public.households;
create policy "Haushalt sehen" on public.households for select to authenticated using (public.is_member(id));
drop policy if exists "Haushalt ändern (Erwachsene)" on public.households;
create policy "Haushalt ändern (Erwachsene)" on public.households for update to authenticated using (public.is_adult(id)) with check (public.is_adult(id));

drop policy if exists "Mitglieder sehen" on public.members;
create policy "Mitglieder sehen" on public.members for select to authenticated using (public.is_member(household_id));
drop policy if exists "Eigene Mitgliedschaft ändern" on public.members;
create policy "Eigene Mitgliedschaft ändern" on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(household_id));

-- invites und invite_attempts: kein direkter Zugriff (nur über Funktionen)

drop policy if exists "Profile im Haushalt sehen" on public.profiles;
create policy "Profile im Haushalt sehen" on public.profiles for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.members m where m.user_id = profiles.user_id and public.is_member(m.household_id))
);
drop policy if exists "Eigenes Profil anlegen" on public.profiles;
create policy "Eigenes Profil anlegen" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Eigenes Profil ändern" on public.profiles;
create policy "Eigenes Profil ändern" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Eigenes Profil löschen" on public.profiles;
create policy "Eigenes Profil löschen" on public.profiles for delete to authenticated using (user_id = auth.uid());

-- Rollen-Rechte: Gäste (anon) nichts, angemeldete nur was die Policies erlauben
revoke all on public.households, public.members, public.invites, public.invite_attempts, public.profiles from anon;
revoke all on public.invites, public.invite_attempts from authenticated;
-- Haushalt: nur Name/Region; Mitgliedschaft: nur Anzeigename und Person (nie die Rolle)
revoke all on public.households, public.members from authenticated;
grant select on public.households, public.members to authenticated;
grant update (name, region) on public.households to authenticated;
grant update (display_name, person_id) on public.members to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Code: 6 Zeichen ohne verwechselbare (kein 0/O, 1/I) ---------------------------
create or replace function public.invite_code_hash(code text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(code, ''), '[^0-9A-Za-z]', '', 'g')), 'UTF8')), 'hex');
$$;

-- Neuen Haushalt anlegen (wer schon in einem ist: Fehler) ----------------------
create or replace function public.create_household(p_name text, p_display_name text default '', p_person_id text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hh uuid;
begin
  if uid is null then raise exception 'nicht_angemeldet'; end if;
  if exists (select 1 from public.members where user_id = uid) then raise exception 'schon_im_haushalt'; end if;
  insert into public.households (name) values (left(coalesce(p_name, ''), 60)) returning id into hh;
  insert into public.members (household_id, user_id, person_id, display_name, role)
    values (hh, uid, left(p_person_id, 80), left(coalesce(p_display_name, ''), 40), 'erwachsener');
  return hh;
end;
$$;

-- Einladen: nur Erwachsene; Code 7 Tage gültig, einmal nutzbar -----------------
create or replace function public.create_invite(p_role text default 'erwachsener')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hh uuid;
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  raw bytea;
  code text := '';
  i int;
begin
  if uid is null then raise exception 'nicht_angemeldet'; end if;
  select household_id into hh from public.members where user_id = uid and role = 'erwachsener';
  if hh is null then raise exception 'darf_nicht_einladen'; end if;
  if p_role not in ('erwachsener', 'kind') then raise exception 'rolle_unbekannt'; end if;
  raw := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
  end loop;
  -- Abgelaufene Einladungen des Haushalts aufräumen
  delete from public.invites where household_id = hh and expires_at < now() - interval '1 day';
  insert into public.invites (code_hash, household_id, role, created_by, expires_at)
    values (public.invite_code_hash(code), hh, p_role, uid, now() + interval '7 days');
  return substr(code, 1, 3) || '-' || substr(code, 4, 3);
end;
$$;

-- Mit Code beitreten (höchstens 10 Fehlversuche pro Stunde). Fehler kommen als
-- Ergebnis {"error": "..."} zurück, nicht als Ausnahme – sonst würde auch der
-- gemerkte Fehlversuch zurückgerollt.
create or replace function public.join_household(p_code text, p_display_name text default '', p_person_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invites%rowtype;
  problem text;
begin
  if uid is null then return jsonb_build_object('error', 'nicht_angemeldet'); end if;
  if exists (select 1 from public.members where user_id = uid) then return jsonb_build_object('error', 'schon_im_haushalt'); end if;
  if (select count(*) from public.invite_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'zu_viele_versuche');
  end if;
  select * into inv from public.invites where code_hash = public.invite_code_hash(p_code) for update;
  problem := case when inv.code_hash is null then 'code_unbekannt' when inv.used_by is not null then 'code_benutzt' when inv.expires_at < now() then 'code_abgelaufen' end;
  if problem is not null then
    insert into public.invite_attempts (user_id) values (uid);
    return jsonb_build_object('error', problem);
  end if;
  insert into public.members (household_id, user_id, person_id, display_name, role)
    values (inv.household_id, uid, left(p_person_id, 80), left(coalesce(p_display_name, ''), 40), inv.role);
  update public.invites set used_by = uid, used_at = now() where code_hash = inv.code_hash;
  delete from public.invite_attempts where user_id = uid;
  return jsonb_build_object('household_id', inv.household_id);
end;
$$;

-- Haushalt verlassen (der letzte macht das Licht aus) ---------------------------
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'nicht_angemeldet'; end if;
  delete from public.members where user_id = auth.uid();
end;
$$;

-- Leerer Haushalt wird gelöscht (auch wenn das letzte Konto gelöscht wird)
create or replace function public.drop_empty_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.members where household_id = old.household_id) then
    delete from public.households where id = old.household_id;
  end if;
  return old;
end;
$$;

drop trigger if exists members_drop_empty_household on public.members;
create trigger members_drop_empty_household after delete on public.members
  for each row execute function public.drop_empty_household();

-- Funktionen: nur für angemeldete Nutzer aufrufbar
revoke execute on function public.create_household(text, text, text), public.create_invite(text), public.join_household(text, text, text), public.leave_household() from public, anon;
grant execute on function public.create_household(text, text, text), public.create_invite(text), public.join_household(text, text, text), public.leave_household() to authenticated;
revoke execute on function public.drop_empty_household() from public, anon, authenticated;
