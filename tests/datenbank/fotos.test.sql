-- Fotos der Pinnwand in Storage (Bucket „fotos“): nur der eigene Haushalt
-- legt ab, liest und löscht; Fremde sehen nichts; nur <haushalt>/<id>.jpg;
-- Memos und Fotos bleiben getrennt.

create or replace function pruefe(ok boolean, was text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FEHLGESCHLAGEN: %', was; end if;
end $$;
create or replace function erwarte_fehler(stmt text, muster text, was text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm like '%' || muster || '%' then return; end if;
    raise exception 'FALSCHER FEHLER bei „%“: %', was, sqlerrm;
  end;
  raise exception 'KEIN FEHLER, obwohl erwartet: %', was;
end $$;
grant execute on function pruefe(boolean, text), erwarte_fehler(text, text, text) to anon, authenticated;

select pruefe((select public = false and file_size_limit = 1572864 and allowed_mime_types = array['image/jpeg'] from storage.buckets where id = 'fotos'), 'Bucket fotos privat, 1,5 MB, nur JPEG');

insert into auth.users (id, email) values
  ('f0f0f0f0-1111-1111-1111-111111111111', 'foto-mara@example.com'),
  ('f1f1f1f1-2222-2222-2222-222222222222', 'foto-jan@example.com'),
  ('f2f2f2f2-3333-3333-3333-333333333333', 'foto-fremd@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'f0f0f0f0-1111-1111-1111-111111111111', false);
select public.create_household('Mara und Jan', 'Mara') as hh \gset
select public.create_invite() as code \gset
select set_config('request.jwt.claim.sub', 'f1f1f1f1-2222-2222-2222-222222222222', false);
select pruefe((public.join_household(:'code', 'Jan') ->> 'household_id') = :'hh', 'Jan tritt bei');
select set_config('request.jwt.claim.sub', 'f2f2f2f2-3333-3333-3333-333333333333', false);
select public.create_household('Fremd') as hh2 \gset

-- Mara hängt ein Foto an
select set_config('request.jwt.claim.sub', 'f0f0f0f0-1111-1111-1111-111111111111', false);
insert into storage.objects (bucket_id, name) values ('fotos', :'hh' || '/zettel-1.jpg');
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 1, 'Mara sieht ihr Foto');
-- nicht in fremde Haushalte, nicht mit falschem Pfad oder Format
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', :'hh2' || '/x.jpg'), 'row-level security', 'Foto in fremden Haushalt');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', :'hh' || '/../x.jpg'), 'row-level security', 'Pfad mit ..');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', :'hh' || '/a/b.jpg'), 'row-level security', 'Unterordner');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', :'hh' || '/x.png'), 'row-level security', 'kein JPEG');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', :'hh' || '/x.m4a'), 'row-level security', 'Ton gehört nicht zu den Fotos');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', :'hh' || '/x.jpg'), 'row-level security', 'Foto nicht in den Memo-Bucket');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'fotos', 'kein-haushalt/x.jpg'), 'row-level security', 'ohne Haushalt-Ordner');

-- Jan (gleicher Haushalt) sieht es
select set_config('request.jwt.claim.sub', 'f1f1f1f1-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 1, 'Jan sieht das Foto');

-- Fremde sehen nichts und löschen nichts
select set_config('request.jwt.claim.sub', 'f2f2f2f2-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 0, 'Fremde sehen nichts');
delete from storage.objects where bucket_id = 'fotos';
select set_config('request.jwt.claim.sub', 'f1f1f1f1-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 1, 'Fremdes Löschen ohne Wirkung');
delete from storage.objects where bucket_id = 'fotos' and name = :'hh' || '/zettel-1.jpg';
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 0, 'Jan räumt von Hand auf');

-- Ohne Anmeldung nichts
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'fotos') = 0, 'anon sieht nichts');
reset role;
