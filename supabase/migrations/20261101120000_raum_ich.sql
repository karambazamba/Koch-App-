-- Raum „Ich“ (Tafel 114): drei Räume, benannt nach „wer sieht es“.
-- - familie = alle im Haushalt (geteilt)
-- - ich     = nur der Besitzer (nicht geteilt, abends sichtbar)
-- - arbeit  = nur der Besitzer (nicht geteilt, nach Feierabend ausgeblendet)
-- „ich“ verhält sich in der Datenbank genau wie „arbeit“: Sehen und Ändern
-- nur für den Besitzer (die Regeln entries_select/entries_update prüfen schon
-- `raum = 'familie' or besitzer = auth.uid()` bzw. entry_visible), Aufgaben bleiben persönlich
-- wie bisher. Wer den Haushalt verlässt, nimmt „ich“ und „arbeit“ mit.
-- Bestehende Einträge bleiben unverändert.

alter table public.entries drop constraint if exists entries_raum_check;
alter table public.entries add constraint entries_raum_check check (raum in ('familie', 'ich', 'arbeit'));

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
