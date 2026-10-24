-- Einladen per Link (Tafel 22, „Anmelden wie man es kennt“)
-- Link https://<app>/e/<token>: zufällig, nur der Hash liegt hier, 14 Tage
-- gültig, mehrfach nutzbar, zurückziehbar. Kein direkter Zugriff auf die
-- Tabelle – nur über Funktionen, die selbst prüfen, wer aufruft. Die
-- Einladungsseite darf vor dem Anmelden nur den Namen der einladenden Person
-- und der Familie sehen (wer den geheimen Link hat). Wer schon in einer
-- anderen Familie ist, wechselt nur auf ausdrücklichen Wunsch.

create table if not exists public.invite_links (
  token_hash text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null default 'erwachsener' check (role in ('erwachsener', 'kind')),
  created_by uuid references auth.users (id) on delete set null,
  inviter_name text not null default '' check (char_length(inviter_name) <= 40),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invite_links_household on public.invite_links (household_id);

alter table public.invite_links enable row level security;
revoke all on public.invite_links from public, anon, authenticated;

create or replace function public.invite_link_hash(token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(token, ''), 'UTF8')), 'hex');
$$;

-- Link anlegen: nur Erwachsene; 14 Tage gültig, mehrfach nutzbar ------------------
create or replace function public.create_invite_link(p_role text default 'erwachsener')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me public.members%rowtype;
  token text;
begin
  if uid is null then raise exception 'nicht_angemeldet'; end if;
  select * into me from public.members where user_id = uid and role = 'erwachsener';
  if me.household_id is null then raise exception 'darf_nicht_einladen'; end if;
  if p_role not in ('erwachsener', 'kind') then raise exception 'rolle_unbekannt'; end if;
  -- 32 Zeichen aus zwei zufälligen UUIDs (nur Buchstaben/Ziffern)
  token := substr(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex'), 1, 32);
  delete from public.invite_links where household_id = me.household_id and expires_at < now() - interval '1 day';
  insert into public.invite_links (token_hash, household_id, role, created_by, inviter_name, expires_at)
    values (public.invite_link_hash(token), me.household_id, p_role, uid, me.display_name, now() + interval '14 days');
  return token;
end;
$$;

-- Offene Einladungen der eigenen Familie (ohne Token, mit kurzer Kennung) --------
create or replace function public.list_invite_links()
returns table (ref text, role text, inviter_name text, expires_at timestamptz, uses int, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select left(l.token_hash, 12), l.role, l.inviter_name, l.expires_at, l.uses, l.created_at
  from public.invite_links l
  join public.members m on m.household_id = l.household_id and m.user_id = auth.uid() and m.role = 'erwachsener'
  where l.revoked_at is null and l.expires_at > now()
  order by l.created_at desc;
$$;

-- Zurückziehen ------------------------------------------------------------------
create or replace function public.revoke_invite_link(p_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid;
begin
  if auth.uid() is null then raise exception 'nicht_angemeldet'; end if;
  select household_id into hh from public.members where user_id = auth.uid() and role = 'erwachsener';
  if hh is null then raise exception 'darf_nicht_einladen'; end if;
  update public.invite_links set revoked_at = now()
    where household_id = hh and left(token_hash, 12) = left(coalesce(p_ref, ''), 12) and char_length(coalesce(p_ref, '')) = 12;
end;
$$;

-- Einladungsseite (auch ohne Konto): wer lädt ein, in welche Familie, noch gültig?
create or replace function public.invite_link_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.invite_links%rowtype;
  hh_name text;
begin
  select * into l from public.invite_links where token_hash = public.invite_link_hash(p_token);
  if l.token_hash is null or l.revoked_at is not null then return jsonb_build_object('status', 'unbekannt'); end if;
  if l.expires_at < now() then return jsonb_build_object('status', 'abgelaufen', 'inviter', l.inviter_name); end if;
  select name into hh_name from public.households where id = l.household_id;
  return jsonb_build_object('status', 'gueltig', 'inviter', l.inviter_name, 'family', coalesce(hh_name, ''));
end;
$$;

-- Mit Link beitreten. Schon in einer anderen Familie: nur mit p_switch (dann
-- wird die alte verlassen). Fehler als Ergebnis, damit Fehlversuche zählen.
create or replace function public.join_by_link(p_token text, p_display_name text default '', p_person_id text default null, p_switch boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  l public.invite_links%rowtype;
  current_hh uuid;
  current_name text;
  problem text;
begin
  if uid is null then return jsonb_build_object('error', 'nicht_angemeldet'); end if;
  if (select count(*) from public.invite_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'zu_viele_versuche');
  end if;
  select * into l from public.invite_links where token_hash = public.invite_link_hash(p_token) for update;
  problem := case when l.token_hash is null or l.revoked_at is not null then 'link_unbekannt' when l.expires_at < now() then 'link_abgelaufen' end;
  if problem is not null then
    insert into public.invite_attempts (user_id) values (uid);
    return jsonb_build_object('error', problem);
  end if;
  select household_id into current_hh from public.members where user_id = uid;
  if current_hh = l.household_id then return jsonb_build_object('household_id', l.household_id); end if;
  if current_hh is not null then
    if not coalesce(p_switch, false) then
      select name into current_name from public.households where id = current_hh;
      return jsonb_build_object('error', 'andere_familie', 'family', coalesce(current_name, ''));
    end if;
    delete from public.members where user_id = uid;
  end if;
  insert into public.members (household_id, user_id, person_id, display_name, role)
    values (l.household_id, uid, left(p_person_id, 80), left(coalesce(p_display_name, ''), 40), l.role);
  update public.invite_links set uses = uses + 1 where token_hash = l.token_hash;
  delete from public.invite_attempts where user_id = uid;
  return jsonb_build_object('household_id', l.household_id);
end;
$$;

revoke execute on function public.create_invite_link(text), public.list_invite_links(), public.revoke_invite_link(text), public.join_by_link(text, text, text, boolean) from public, anon;
grant execute on function public.create_invite_link(text), public.list_invite_links(), public.revoke_invite_link(text), public.join_by_link(text, text, text, boolean) to authenticated;
revoke execute on function public.invite_link_info(text) from public;
grant execute on function public.invite_link_info(text) to anon, authenticated;
