-- Pinnwand „Nur für mich“ (Tafel 123): ein Zettel mit privat = true sieht
-- und ändert nur, wer ihn geschrieben hat – wie „Arbeit“ (owner-only).
-- Der Zettel liegt in `entries` (typ "pinnwand"); `data` ist der ganze
-- Eintrag der App, `privat` steht in data.data (zur Sicherheit auch ganz
-- oben geprüft). Reihenfolge (`sort`) und Größe (`groesse`) stehen nur in
-- data und brauchen keine Spalte.
-- Regeln:
-- - Lesen/Ändern eines privaten Eintrags nur durch den Besitzer.
-- - Niemand darf einen fremden Eintrag privat machen (er wäre sonst für den
--   Besitzer und alle anderen weg).
-- - Bilder: Die App lädt Bilder privater Zettel gar nicht erst hoch. Liegt
--   doch eins im Bucket „fotos“ und gehört zu einem privaten Zettel, sieht
--   und löscht es nur der Besitzer (Prüfung über eine Funktion mit
--   Besitzer-Rechten, weil die Mitglieder den privaten Zettel selbst nicht
--   sehen dürfen).
-- - Aufgaben (abgeben) bleiben wie gehabt.
-- - Baut auf den drei Räumen auf (A-034, `20261101120000_raeume_ich.sql`):
--   Familie sehen alle, „ich“ und „arbeit“ nur der Besitzer (Aufgaben auch,
--   wer sie hält bzw. zurückgab). „Nur für mich“ kommt als erste Regel davor
--   und gilt in jedem Raum.

create or replace function public.entry_privat(p_data jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_data ->> 'privat', '') = 'true' or coalesce(p_data -> 'data' ->> 'privat', '') = 'true';
$$;
revoke all on function public.entry_privat(jsonb) from public, anon;
grant execute on function public.entry_privat(jsonb) to authenticated;

create or replace function public.entry_visible(p_typ text, p_raum text, p_besitzer uuid, p_data jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_typ <> 'aufgabe' and public.entry_privat(p_data) then p_besitzer = auth.uid()
    when p_raum = 'familie' then true
    when p_typ = 'aufgabe' then p_besitzer = auth.uid()
      or public.entry_holder(p_data, 'fuer') = auth.uid()::text
      or public.entry_holder(p_data, 'zurueck') = auth.uid()::text
    else p_besitzer = auth.uid()
  end;
$$;
revoke all on function public.entry_visible(text, text, uuid, jsonb) from public, anon;
grant execute on function public.entry_visible(text, text, uuid, jsonb) to authenticated;

-- Ändern: wie bei den drei Räumen (danach weiter sichtbar) – und privat
-- machen darf nur der Besitzer
drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries for update to authenticated
  using (public.is_member(household_id) and public.entry_visible(typ, raum, besitzer, data))
  with check (
    household_id = public.my_household()
    and (
      raum = 'familie'
      or besitzer = auth.uid()
      or (typ = 'aufgabe' and (public.entry_holder(data, 'fuer') = auth.uid()::text or public.entry_holder(data, 'zurueck') = auth.uid()::text))
    )
    and (not public.entry_privat(data) or besitzer = auth.uid())
  );

-- Gehört ein Bild zu einem privaten Zettel von jemand anderem? (Besitzer-Rechte,
-- weil der Zettel für die anderen unsichtbar ist; liefert nur ja/nein)
create or replace function public.foto_fremd_privat(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entries e
    where e.household_id = public.foto_household(p_name)
      and e.typ = 'pinnwand'
      and not e.geloescht
      and public.entry_privat(e.data)
      and e.besitzer is distinct from auth.uid()
      and coalesce(e.data -> 'data' -> 'foto' ->> 'path', e.data -> 'foto' ->> 'path', '') = p_name
  );
$$;
revoke all on function public.foto_fremd_privat(text) from public, anon;
grant execute on function public.foto_fremd_privat(text) to authenticated;

drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.is_member(public.foto_household(name)) and not public.foto_fremd_privat(name));

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_member(public.foto_household(name)) and not public.foto_fremd_privat(name));
