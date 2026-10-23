-- Sprachnachrichten teilen (Etappe 3c): der Ton liegt in Supabase Storage,
-- Bucket „memos“ (privat), Pfad <haushalt>/<memo-id>.m4a|webm|ogg. Der
-- Eintrag selbst (typ "memo", mit „gehört von“) läuft über `entries`.
-- Regeln:
-- - Nur Mitglieder des Haushalts (erster Ordner = Haushalt) lesen, legen ab
--   und löschen. Fremde sehen nichts.
-- - Höchstens 2 MB je Datei, nur Ton.
-- - Abgelaufenes räumt der Server täglich weg (Vercel Cron,
--   /api/memos/aufraeumen); ohne CRON_SECRET räumt die App beim Öffnen auf.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memos', 'memos', false, 2097152, array['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Haushalt aus dem Pfad („<uuid>/<datei>“); alles andere = null (kein Zugriff)
create or replace function public.memo_household(p_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  first text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if first !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  -- genau ein Ordner, Dateiname nur aus harmlosen Zeichen
  if p_name !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,80}\.(m4a|webm|ogg)$' then
    return null;
  end if;
  return first::uuid;
end;
$$;
revoke all on function public.memo_household(text) from public, anon;
grant execute on function public.memo_household(text) to authenticated;

drop policy if exists memos_select on storage.objects;
create policy memos_select on storage.objects for select to authenticated
  using (bucket_id = 'memos' and public.is_member(public.memo_household(name)));

drop policy if exists memos_insert on storage.objects;
create policy memos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'memos' and public.memo_household(name) = public.my_household());

drop policy if exists memos_delete on storage.objects;
create policy memos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memos' and public.is_member(public.memo_household(name)));
