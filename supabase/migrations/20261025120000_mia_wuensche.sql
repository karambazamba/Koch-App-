-- „Kann ich noch nicht“ (Auftrag „Mia auf Claude-Niveau“): Wünsche, die Mia
-- noch nicht erfüllen kann, anonym zählen – nur Text und Datum, keine Person,
-- kein Haushalt, keine IP. Schreiben nur der Server (geheimer Schlüssel);
-- niemand in der App kann lesen oder schreiben (RLS an, keine Policies).

create table if not exists public.mia_wuensche (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 3 and 120),
  tag date not null default current_date,
  erstellt timestamptz not null default now()
);

alter table public.mia_wuensche enable row level security;

revoke all on public.mia_wuensche from anon, authenticated;
