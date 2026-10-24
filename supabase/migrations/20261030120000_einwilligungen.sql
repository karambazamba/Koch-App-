-- Einwilligungen (Datenschutz, Platz 23): Nachweis je Person – Art
-- (KI, Bedingungen, Mails an Mia), Textfassung, ja/nein, Zeitpunkt. Nur
-- anhängen (Widerruf = neue Zeile mit ja = false), lesen nur die eigenen.
-- Mit dem Konto gelöscht.

create table if not exists public.einwilligungen (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  art text not null check (art in ('ki', 'bedingungen', 'mails')),
  version int not null check (version between 1 and 1000),
  ja boolean not null,
  at timestamptz not null default now()
);
create index if not exists einwilligungen_user on public.einwilligungen (user_id, art, at desc);

alter table public.einwilligungen enable row level security;
revoke all on public.einwilligungen from anon, authenticated;
grant select, insert on public.einwilligungen to authenticated;

drop policy if exists einwilligungen_lesen on public.einwilligungen;
create policy einwilligungen_lesen on public.einwilligungen for select to authenticated using (user_id = auth.uid());
drop policy if exists einwilligungen_schreiben on public.einwilligungen;
create policy einwilligungen_schreiben on public.einwilligungen for insert to authenticated with check (user_id = auth.uid());
