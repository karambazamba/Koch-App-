-- „Was los?“ (A-055): Veranstaltungen aus dem öffentlichen Kalender des
-- Kreises Ostholstein. Nur ID, Titel, Datum, Uhrzeit, Ort (Text), Link und
-- selbst abgeleitete Kategorien – keine Beschreibungen, keine Bilder, keine
-- Personendaten. Lesen darf die App (auch ohne Konto: anon und authenticated
-- nur SELECT), schreiben nur der Server mit dem geheimen Schlüssel (service
-- role umgeht RLS). Abgelaufenes löscht der tägliche Lauf.

create table if not exists public.region_events (
  id text primary key check (char_length(id) between 3 and 80),
  quelle text not null default 'kreisoh' check (quelle in ('kreisoh')),
  titel text not null check (char_length(titel) between 1 and 160),
  datum date not null,
  bis_datum date check (bis_datum is null or bis_datum > datum),
  letzter_tag date not null,
  beginn text check (beginn is null or beginn ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ende text check (ende is null or ende ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ganztags boolean not null default false,
  ort text not null default '' check (char_length(ort) <= 160),
  gemeinde text check (gemeinde is null or char_length(gemeinde) <= 60),
  link text check (link is null or (link ~ '^https://' and char_length(link) <= 500)),
  kategorien text[] not null default '{sonstiges}' check (kategorien <@ array['kinder', 'kultur', 'draussen', 'markt', 'sonstiges']::text[]),
  aktualisiert timestamptz not null default now()
);

create index if not exists region_events_zeit on public.region_events (letzter_tag, datum);

alter table public.region_events enable row level security;

revoke all on public.region_events from anon, authenticated;
grant select on public.region_events to anon, authenticated;

drop policy if exists region_events_lesen on public.region_events;
create policy region_events_lesen on public.region_events for select to anon, authenticated using (true);

-- Letzter Lauf (eine Zeile): wann, wie viele Treffer, Kurzwort („ok“, „leer“,
-- „fehler“, „wartet“) – für „Für Entwickler“ („Was los?: Quelle liefert nichts“).
create table if not exists public.region_status (
  id smallint primary key check (id = 1),
  lauf timestamptz not null default now(),
  treffer integer not null default 0 check (treffer >= 0),
  grund text not null default 'ok' check (char_length(grund) <= 20)
);

alter table public.region_status enable row level security;

revoke all on public.region_status from anon, authenticated;
grant select on public.region_status to anon, authenticated;

drop policy if exists region_status_lesen on public.region_status;
create policy region_status_lesen on public.region_status for select to anon, authenticated using (true);
