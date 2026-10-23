-- Aufgaben sind persönlich – abgeben geht (Tafel 52 B).
-- Termine, Einkauf, Pinnwand, Wochenplan, Vorrat bleiben gemeinsam
-- („Familie“ für alle im Haushalt, „Arbeit“ nur für den Besitzer).
-- Aufgaben gehören der Person, die sie anlegt: sehen und ändern darf sie nur
-- der Besitzer – und, wer sie bekommen hat (data.fuer = Konto-ID der
-- Person, die sie gerade hält). Abgeben = data.fuer setzen, zurückgeben =
-- data.fuer leeren und data.zurueck = eigene ID (Postgres erlaubt keine
-- Änderung, nach der man die Zeile selbst nicht mehr sehen dürfte; die App
-- blendet zurückgegebene Aufgaben beim Empfänger aus). Nichts wird gelöscht: Aufgaben, die seit 3b geteilt waren,
-- gehören weiter ihrem Ersteller (besitzer) und sind ab jetzt nur für ihn.

create or replace function public.entry_visible(p_typ text, p_raum text, p_besitzer uuid, p_data jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_typ = 'aufgabe' then p_besitzer = auth.uid()
      or coalesce(p_data ->> 'fuer', '') = auth.uid()::text
      or coalesce(p_data ->> 'zurueck', '') = auth.uid()::text
    else p_raum = 'familie' or p_besitzer = auth.uid()
  end;
$$;
revoke all on function public.entry_visible(text, text, uuid, jsonb) from public, anon;
grant execute on function public.entry_visible(text, text, uuid, jsonb) to authenticated;

drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries for select to authenticated
  using (public.is_member(household_id) and public.entry_visible(typ, raum, besitzer, data));

-- Ändern: nur, was man sehen darf. Danach muss es im eigenen Haushalt
-- bleiben; eine Aufgabe darf man dabei weitergeben (dann sieht man sie als
-- Empfänger nicht mehr – der Besitzer behält sie immer).
drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries for update to authenticated
  using (public.is_member(household_id) and public.entry_visible(typ, raum, besitzer, data))
  with check (
    household_id = public.my_household()
    and (typ = 'aufgabe' or raum = 'familie' or besitzer = auth.uid())
  );
