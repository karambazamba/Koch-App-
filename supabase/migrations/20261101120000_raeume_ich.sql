-- Drei Räume für Termine und Aufgaben (A-034): Familie · Ich · Arbeit.
-- - familie = alle im Haushalt sehen es – jetzt auch Aufgaben (jeder darf
--   abhaken, „erledigt von Lisa“ steht in data.data.doneBy).
-- - ich     = nur der Besitzer (wie „arbeit“, nur abends nicht ausgeblendet).
-- - arbeit  = nur der Besitzer.
-- Aufgaben in „ich“/„arbeit“ sehen außerdem, wer sie bekommen hat (fuer) und
-- wer sie zuletzt zurückgegeben hat (zurueck) – „An … geben“ bleibt.
--
-- Fehler aus A-028 behoben: Die App lädt den ganzen Eintrag als `data` hoch
-- ({ id, typ, raum, besitzer, data: { title, fuer, … } }). `entry_visible`
-- suchte `fuer`/`zurueck` aber oben in `data` – abgegebene Aufgaben kamen so
-- beim Empfänger nie an. Jetzt zählt `data.data.fuer` (und, für alte bzw.
-- Test-Zeilen, weiter `data.fuer`).
--
-- Bestehende Aufgaben gehörten bisher nur ihrem Ersteller. Damit nichts
-- plötzlich für alle sichtbar wird, werden sie einmalig „ich“ (nichts geht
-- verloren, Besitzer und Inhalt bleiben). Bestehende Termine bleiben Familie
-- bzw. Arbeit. Die Umstellung läuft nur einmal (Merker im Kommentar der
-- Tabelle), damit ein zweites Einspielen keine neuen Familien-Aufgaben
-- verschiebt. Wer den Haushalt verlässt, nimmt „ich“ und „arbeit“ mit.

alter table public.entries drop constraint if exists entries_raum_check;
alter table public.entries add constraint entries_raum_check check (raum in ('familie', 'ich', 'arbeit'));

-- Wer hält eine Aufgabe (fuer) bzw. hat sie zurückgegeben (zurueck)? Erst im
-- Eintrag (data.data.…, so lädt die App hoch), sonst oben (data.…).
create or replace function public.entry_holder(p_data jsonb, p_key text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(p_data -> 'data' ->> p_key, ''), nullif(p_data ->> p_key, ''), '');
$$;
revoke all on function public.entry_holder(jsonb, text) from public, anon;
grant execute on function public.entry_holder(jsonb, text) to authenticated;

create or replace function public.entry_visible(p_typ text, p_raum text, p_besitzer uuid, p_data jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_raum = 'familie' then true
    when p_typ = 'aufgabe' then p_besitzer = auth.uid()
      or public.entry_holder(p_data, 'fuer') = auth.uid()::text
      or public.entry_holder(p_data, 'zurueck') = auth.uid()::text
    else p_besitzer = auth.uid()
  end;
$$;
revoke all on function public.entry_visible(text, text, uuid, jsonb) from public, anon;
grant execute on function public.entry_visible(text, text, uuid, jsonb) to authenticated;

drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries for select to authenticated
  using (public.is_member(household_id) and public.entry_visible(typ, raum, besitzer, data));

-- Ändern: nur, was man sehen darf. Danach muss es im eigenen Haushalt bleiben
-- und weiter sichtbar sein: Familie, eigenes, oder eine Aufgabe, die man
-- gerade hält bzw. zurückgibt. So kann niemand eine fremde Familien-Aufgabe
-- auf „ich“ stellen und sie dem Besitzer wegnehmen.
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
  );

-- Wer geht, nimmt „ich“ und „arbeit“ mit, Familie bleibt
create or replace function public.drop_work_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries where household_id = old.household_id and besitzer = old.user_id and raum in ('arbeit', 'ich');
  return old;
end;
$$;
revoke all on function public.drop_work_entries() from public, anon, authenticated;

-- Einmalig: bestehende Aufgaben → „ich“ (waren bisher nur für den Ersteller)
do $$
begin
  if coalesce(obj_description('public.entries'::regclass, 'pg_class'), '') not like '%raeume-ich%' then
    update public.entries set raum = 'ich' where typ = 'aufgabe' and raum = 'familie';
    comment on table public.entries is 'Gemeinsame Einträge (3b). raeume-ich: bestehende Aufgaben einmalig auf „ich“ gestellt (A-034).';
  end if;
end;
$$;
