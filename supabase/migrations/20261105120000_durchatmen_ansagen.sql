-- Durchatmen (A-051): Mias feste Ansagen als kleine MP3-Dateien plus
-- manifest.json im Bucket „durchatmen-ansagen“. Erzeugt EINMAL auf dem Server
-- (/api/durchatmen/ansagen-erzeugen, ElevenLabs, nur die festen Sätze aus
-- content/durchatmen/ansagen.json – nie Daten von Nutzern).
-- Regeln:
-- - Öffentlich lesbar (die App lädt sie ohne Anmeldung, der Service-Worker
--   merkt sie sich). Kein Personenbezug.
-- - Schreiben, Ändern, Löschen nur mit dem geheimen Schlüssel auf dem Server
--   (service_role umgeht RLS) – für anon/authenticated gibt es keine Regel.
-- - Höchstens 1 MB je Datei, nur MP3 und JSON.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('durchatmen-ansagen', 'durchatmen-ansagen', true, 1048576, array['audio/mpeg', 'application/json'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists durchatmen_ansagen_lesen on storage.objects;
create policy durchatmen_ansagen_lesen on storage.objects for select to anon, authenticated
  using (bucket_id = 'durchatmen-ansagen');
