-- Sprachnachrichten in Storage: nur der eigene Haushalt legt ab, liest und
-- löscht; Fremde sehen nichts; falsche Pfade gehen nie durch.

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

select pruefe((select public = false and file_size_limit = 2097152 from storage.buckets where id = 'memos'), 'Bucket memos privat, 2 MB');

insert into auth.users (id, email) values
  ('a4444444-1111-1111-1111-111111111111', 'memo-mara@example.com'),
  ('b5555555-2222-2222-2222-222222222222', 'memo-jan@example.com'),
  ('c6666666-3333-3333-3333-333333333333', 'memo-fremd@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a4444444-1111-1111-1111-111111111111', false);
select public.create_household('Mara und Jan', 'Mara') as hh \gset
select public.create_invite() as code \gset
select set_config('request.jwt.claim.sub', 'b5555555-2222-2222-2222-222222222222', false);
select pruefe((public.join_household(:'code', 'Jan') ->> 'household_id') = :'hh', 'Jan tritt bei');
select set_config('request.jwt.claim.sub', 'c6666666-3333-3333-3333-333333333333', false);
select public.create_household('Fremd') as hh2 \gset

-- Mara legt ein Memo ab
select set_config('request.jwt.claim.sub', 'a4444444-1111-1111-1111-111111111111', false);
insert into storage.objects (bucket_id, name) values ('memos', :'hh' || '/memo-1.m4a');
select pruefe((select count(*) from storage.objects where bucket_id = 'memos') = 1, 'Mara sieht ihr Memo');
-- nicht in fremde Haushalte, nicht mit falschem Pfad
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', :'hh2' || '/x.m4a'), 'row-level security', 'Memo in fremden Haushalt');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', :'hh' || '/../x.m4a'), 'row-level security', 'Pfad mit ..');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', :'hh' || '/a/b.m4a'), 'row-level security', 'Unterordner');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', :'hh' || '/x.exe'), 'row-level security', 'kein Ton');
select erwarte_fehler(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'memos', 'kein-haushalt/x.m4a'), 'row-level security', 'ohne Haushalt-Ordner');

-- Jan (gleicher Haushalt) sieht und löscht
select set_config('request.jwt.claim.sub', 'b5555555-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'memos') = 1, 'Jan sieht das Memo');

-- Fremde sehen nichts und löschen nichts
select set_config('request.jwt.claim.sub', 'c6666666-3333-3333-3333-333333333333', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'memos') = 0, 'Fremde sehen nichts');
delete from storage.objects where bucket_id = 'memos';
select set_config('request.jwt.claim.sub', 'b5555555-2222-2222-2222-222222222222', false);
select pruefe((select count(*) from storage.objects where bucket_id = 'memos') = 1, 'Fremdes Löschen ohne Wirkung');
delete from storage.objects where bucket_id = 'memos' and name = :'hh' || '/memo-1.m4a';
select pruefe((select count(*) from storage.objects where bucket_id = 'memos') = 0, 'Jan räumt auf');

-- Ohne Anmeldung nichts
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pruefe((select count(*) from storage.objects) = 0, 'anon sieht nichts');
reset role;
