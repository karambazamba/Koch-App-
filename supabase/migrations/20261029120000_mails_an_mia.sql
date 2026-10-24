-- Mails an Mia (weiterleiten, Mia lernt mit)
-- Adressen pro Familie (Raum Familie) und pro Person (Raum Arbeit), daraus
-- entstandene Vorschläge (nur Absender-Domain, Betreff, Auszug ≤ 300 Zeichen,
-- Vorschläge – nie die Rohmail) und gelernte Absender. Geschrieben wird nur
-- vom Server (Webhook, geheimer Schlüssel); lesen, verwerfen und entscheiden
-- dürfen Mitglieder der Familie – „Arbeit“ nur die Person selbst.
-- Vorschläge verfallen nach 7 Tagen.

create table if not exists public.mail_addresses (
  local_part text primary key check (local_part ~ '^[a-z0-9-]{6,60}$'),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  room text not null check (room in ('familie', 'arbeit')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((room = 'arbeit') = (user_id is not null))
);
create index if not exists mail_addresses_household on public.mail_addresses (household_id);

create table if not exists public.mail_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  room text not null check (room in ('familie', 'arbeit')),
  sender_domain text not null default '' check (char_length(sender_domain) <= 120),
  sender_key text not null default '' check (char_length(sender_key) <= 200),
  subject text not null default '' check (char_length(subject) <= 200),
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  vorschlaege jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  confirmation jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  check ((room = 'arbeit') = (user_id is not null))
);
create index if not exists mail_items_household on public.mail_items (household_id, created_at);

create table if not exists public.mail_senders (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  room text not null check (room in ('familie', 'arbeit')),
  sender text not null check (char_length(sender) <= 200),
  count int not null default 0,
  accepted int not null default 0,
  decision text check (decision in ('ja', 'nein')),
  updated_at timestamptz not null default now()
);
create unique index if not exists mail_senders_key on public.mail_senders (household_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), room, sender);

alter table public.mail_addresses enable row level security;
alter table public.mail_items enable row level security;
alter table public.mail_senders enable row level security;
revoke all on public.mail_addresses, public.mail_items, public.mail_senders from anon, authenticated;
grant select on public.mail_addresses, public.mail_senders to authenticated;
grant select, delete on public.mail_items to authenticated;

-- Sichtbar: Familie für alle im Haushalt, Arbeit nur für die Person
create or replace function public.mail_visible(hh uuid, uid uuid, rm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_member(hh) and (rm = 'familie' or uid = auth.uid());
$$;

drop policy if exists mail_addresses_lesen on public.mail_addresses;
create policy mail_addresses_lesen on public.mail_addresses for select to authenticated using (active and public.mail_visible(household_id, user_id, room));
drop policy if exists mail_items_lesen on public.mail_items;
create policy mail_items_lesen on public.mail_items for select to authenticated using (public.mail_visible(household_id, user_id, room) and expires_at > now());
drop policy if exists mail_items_weg on public.mail_items;
create policy mail_items_weg on public.mail_items for delete to authenticated using (public.mail_visible(household_id, user_id, room));
drop policy if exists mail_senders_lesen on public.mail_senders;
create policy mail_senders_lesen on public.mail_senders for select to authenticated using (public.mail_visible(household_id, user_id, room));

-- Adresse holen (bzw. anlegen): Familie „familie-<name>-<4>“, Arbeit „<vorname>-arbeit-<4>“
create or replace function public.mail_slug(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(left(trim(both '-' from regexp_replace(replace(replace(replace(replace(lower(regexp_replace(coalesce(t, ''), '^\s*familie\s+', '', 'i')), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'), '[^a-z0-9]+', '-', 'g')), 20), ''), 'mia');
$$;

create or replace function public.mail_address(p_room text, p_renew boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me public.members%rowtype;
  hh_name text;
  existing text;
  local text;
  rnd text;
begin
  if uid is null then raise exception 'nicht_angemeldet'; end if;
  if p_room not in ('familie', 'arbeit') then raise exception 'raum_unbekannt'; end if;
  select * into me from public.members where user_id = uid;
  if me.household_id is null then raise exception 'keine_familie'; end if;
  if p_room = 'familie' and me.role <> 'erwachsener' then raise exception 'darf_nicht_einladen'; end if;
  select local_part into existing from public.mail_addresses
    where household_id = me.household_id and room = p_room and active and (p_room = 'familie' or user_id = uid) limit 1;
  if existing is not null and not coalesce(p_renew, false) then return existing; end if;
  -- „Adresse ändern“: die alte nimmt nichts mehr an
  update public.mail_addresses set active = false
    where household_id = me.household_id and room = p_room and (p_room = 'familie' or user_id = uid);
  select name into hh_name from public.households where id = me.household_id;
  loop
    rnd := substr(encode(uuid_send(gen_random_uuid()), 'hex'), 1, 4);
    local := case when p_room = 'arbeit' then public.mail_slug(me.display_name) || '-arbeit-' || rnd else 'familie-' || public.mail_slug(hh_name) || '-' || rnd end;
    exit when not exists (select 1 from public.mail_addresses where local_part = local);
  end loop;
  insert into public.mail_addresses (local_part, household_id, user_id, room)
    values (local, me.household_id, case when p_room = 'arbeit' then uid end, p_room);
  return local;
end;
$$;

-- Absender: „Ja, gern“ / „Nein danke“ (Nein = nie wieder fragen); übernommen zählt mit
create or replace function public.mail_sender_decide(p_sender text, p_room text, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid := public.my_household();
begin
  if auth.uid() is null or hh is null then raise exception 'nicht_angemeldet'; end if;
  if p_decision not in ('ja', 'nein') then raise exception 'entscheidung_unbekannt'; end if;
  update public.mail_senders set decision = p_decision, updated_at = now()
    where household_id = hh and room = p_room and sender = p_sender and (room = 'familie' or user_id = auth.uid());
end;
$$;

create or replace function public.mail_sender_accepted(p_sender text, p_room text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid := public.my_household();
begin
  if auth.uid() is null or hh is null then raise exception 'nicht_angemeldet'; end if;
  update public.mail_senders set accepted = accepted + 1, updated_at = now()
    where household_id = hh and room = p_room and sender = p_sender and (room = 'familie' or user_id = auth.uid());
end;
$$;

revoke execute on function public.mail_address(text, boolean), public.mail_sender_decide(text, text, text), public.mail_sender_accepted(text, text) from public, anon;
grant execute on function public.mail_address(text, boolean), public.mail_sender_decide(text, text, text), public.mail_sender_accepted(text, text) to authenticated;
revoke execute on function public.mail_visible(uuid, uuid, text) from public, anon;
grant execute on function public.mail_visible(uuid, uuid, text) to authenticated;
