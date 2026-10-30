-- Abo eines Geräts speichern (A-069, Fehler „abo_abgelehnt“): Das Upsert
-- über PostgREST (on_conflict=endpoint, merge-duplicates) setzt im
-- ON CONFLICT DO UPDATE alle gesendeten Spalten – auch endpoint. Das
-- UPDATE-Recht für „authenticated“ umfasst endpoint aber nicht, und Postgres
-- prüft es schon beim INSERT … ON CONFLICT → 42501 → 403.
-- Lösung: Speichern nur noch über push_abo_speichern() (security definer).
-- Die Funktion setzt user_id = auth.uid() und household_id = my_household()
-- selbst (nie aus dem Aufruf), prüft die Werte über die Tabelle (https,
-- Längen, Größe der Einstellungen) und ersetzt einen alten Eintrag desselben
-- Geräts, der noch einem anderen Konto gehört (ab-/angemeldet), statt
-- abzulehnen. Die Rechte auf der Tabelle bleiben, wie sie sind (RLS).

create or replace function public.push_abo_speichern(p_endpoint text, p_p256dh text, p_auth text, p_settings jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hh uuid := public.my_household();
  rid uuid;
begin
  if uid is null then
    raise exception 'nicht angemeldet' using errcode = '28000';
  end if;
  -- Gleiches Gerät, anderes Konto (ab- und neu angemeldet): der alte Eintrag weicht
  delete from public.push_abos where endpoint = p_endpoint and user_id <> uid;
  insert into public.push_abos (user_id, household_id, endpoint, p256dh, auth, settings, updated_at)
  values (uid, hh, p_endpoint, p_p256dh, p_auth, coalesce(p_settings, '{}'::jsonb), now())
  on conflict (endpoint) do update
    set household_id = excluded.household_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        settings = excluded.settings,
        updated_at = now()
  returning id into rid;
  return rid;
end;
$$;
revoke all on function public.push_abo_speichern(text, text, text, jsonb) from public, anon;
grant execute on function public.push_abo_speichern(text, text, text, jsonb) to authenticated;
