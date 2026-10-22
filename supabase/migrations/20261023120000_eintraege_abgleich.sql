-- Gemeinsame Einträge (Etappe 3b): eine Tabelle im einheitlichen Modell für
-- Termine, Aufgaben, Notizen, Einkaufsliste, Pinnwand, Wochenplan und Vorrat.
-- Regeln:
-- - Nur Mitglieder des eigenen Haushalts sehen und schreiben Einträge.
-- - „Arbeit“ sieht und ändert nur der Besitzer.
-- - Neueste Änderung je Eintrag gewinnt (geaendert, Zeit des Geräts).
-- - Löschen nur als Markierung (geloescht) – nie hart löschen beim Abgleich.
-- - rev = fortlaufende Nummer des Servers (zum Nachladen „alles seit …“).

create sequence if not exists public.entries_rev;

create table if not exists public.entries (
  household_id uuid not null references public.households (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  typ text not null check (typ ~ '^[a-z-]{1,30}$'),
  raum text not null default 'familie' check (raum in ('familie', 'arbeit')),
  -- wer es angelegt hat (ohne Fremdschlüssel: Familien-Einträge bleiben,
  -- wenn das Konto gelöscht wird; „Arbeit“ räumt drop_work_entries weg)
  besitzer uuid not null,
  erstellt timestamptz not null default now(),
  geaendert timestamptz not null default now(),
  geloescht boolean not null default false,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 65536),
  rev bigint not null default nextval('public.entries_rev'),
  primary key (household_id, id)
);
create index if not exists entries_household_rev on public.entries (household_id, rev);

alter table public.entries enable row level security;

-- rev setzt immer der Server
create or replace function public.entries_set_rev()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.rev := nextval('public.entries_rev');
  return new;
end;
$$;
drop trigger if exists entries_rev on public.entries;
create trigger entries_rev before insert or update on public.entries
  for each row execute function public.entries_set_rev();

drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries for select to authenticated
  using (public.is_member(household_id) and (raum = 'familie' or besitzer = auth.uid()));

drop policy if exists entries_insert on public.entries;
create policy entries_insert on public.entries for insert to authenticated
  with check (household_id = public.my_household() and besitzer = auth.uid());

drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries for update to authenticated
  using (public.is_member(household_id) and (raum = 'familie' or besitzer = auth.uid()))
  with check (household_id = public.my_household() and (raum = 'familie' or besitzer = auth.uid()));

revoke all on public.entries from anon, authenticated;
grant select on public.entries to authenticated;
grant insert (household_id, id, typ, raum, besitzer, erstellt, geaendert, geloescht, data) on public.entries to authenticated;
grant update (typ, raum, geaendert, geloescht, data) on public.entries to authenticated;
grant usage on sequence public.entries_rev to authenticated;

-- Hochladen: je Eintrag „neueste Änderung gewinnt“. Rechte prüft RLS
-- (security invoker); ein abgelehnter Eintrag hält die anderen nicht auf.
-- Besitzer und „erstellt“ bleiben beim Ändern, wie sie sind.
create or replace function public.sync_entries(p_docs jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  hh uuid := public.my_household();
  d jsonb;
  skipped text[] := '{}';
  n int := 0;
begin
  if auth.uid() is null or hh is null then
    return jsonb_build_object('error', 'kein_haushalt');
  end if;
  if jsonb_typeof(p_docs) <> 'array' or jsonb_array_length(p_docs) > 500 then
    return jsonb_build_object('error', 'zu_viele');
  end if;
  for d in select * from jsonb_array_elements(p_docs) loop
    begin
      insert into public.entries as e (household_id, id, typ, raum, besitzer, erstellt, geaendert, geloescht, data)
      values (
        hh,
        d ->> 'id',
        d ->> 'typ',
        coalesce(d ->> 'raum', 'familie'),
        auth.uid(),
        coalesce((d ->> 'erstellt')::timestamptz, now()),
        (d ->> 'geaendert')::timestamptz,
        coalesce((d ->> 'geloescht')::boolean, false),
        coalesce(d -> 'data', '{}'::jsonb)
      )
      on conflict (household_id, id) do update
        set typ = excluded.typ,
            raum = excluded.raum,
            geaendert = excluded.geaendert,
            geloescht = excluded.geloescht,
            data = excluded.data
        where e.geaendert < excluded.geaendert;
      n := n + 1;
    exception when others then
      skipped := skipped || coalesce(d ->> 'id', '?');
    end;
  end loop;
  return jsonb_build_object('ok', n, 'skipped', to_jsonb(skipped));
end;
$$;

revoke all on function public.sync_entries(jsonb) from public, anon;
grant execute on function public.sync_entries(jsonb) to authenticated;
revoke all on function public.entries_set_rev() from public, anon, authenticated;

-- Wer den Haushalt verlässt (oder sein Konto löscht), nimmt „Arbeit“ mit:
-- seine persönlichen Einträge werden dort entfernt, Familien-Einträge bleiben.
create or replace function public.drop_work_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries where household_id = old.household_id and besitzer = old.user_id and raum = 'arbeit';
  return old;
end;
$$;
drop trigger if exists members_drop_work on public.members;
create trigger members_drop_work before delete on public.members
  for each row execute function public.drop_work_entries();
revoke all on function public.drop_work_entries() from public, anon, authenticated;

-- Realtime: Änderungen anderer sofort (RLS gilt auch hier)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entries') then
    alter publication supabase_realtime add table public.entries;
  end if;
end;
$$;
