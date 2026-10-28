-- Fotos an der Pinnwand (Kühlschranktür, Tafel 106): das Bild eines
-- Foto-Zettels liegt in Supabase Storage, Bucket „fotos“ (privat), Pfad
-- <haushalt>/<zettel-id>.jpg. Der Zettel selbst (typ "pinnwand", papier
-- "foto") läuft über `entries`.
-- Regeln:
-- - Nur Mitglieder des Haushalts (erster Ordner = Haushalt) lesen, legen ab
--   und löschen. Fremde sehen nichts.
-- - Höchstens 1,5 MB je Datei, nur JPEG (die App verkleinert vorher auf
--   1600 px).
-- - Weggeräumt wird nur, was zu einem von Hand gelöschten Zettel gehört
--   (Vercel Cron, /api/memos/aufraeumen) – nie nach Alter.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 1572864, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Haushalt aus dem Pfad („<uuid>/<datei>.jpg“); alles andere = null (kein Zugriff)
create or replace function public.foto_household(p_name text)
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
  if p_name !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,80}\.jpg$' then
    return null;
  end if;
  return first::uuid;
end;
$$;
revoke all on function public.foto_household(text) from public, anon;
grant execute on function public.foto_household(text) to authenticated;

drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.is_member(public.foto_household(name)));

drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.foto_household(name) = public.my_household());

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_member(public.foto_household(name)));
