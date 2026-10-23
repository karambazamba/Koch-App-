-- Mitteilungen per Web Push (Tafel 77, Teil 2): Erinnerungen kommen auch,
-- wenn die App zu ist.
-- - push_abos: ein Abo je Gerät (Endpunkt + Schlüssel des Browsers). Jede:r
--   sieht, legt an und löscht nur eigene Abos (RLS). Einstellungen des Geräts
--   (Arten, Pause, Standard) liegen mit am Abo, damit der Server sie beachtet.
-- - push_config: VAPID-Schlüssel und das Cron-Zeichen. Erzeugt der Server beim
--   ersten Bedarf selbst; NUR Service-Rolle (RLS an, keine Regeln, keine
--   Rechte für anon/authenticated) – nie im Repo, nie im Client, nie im Log.
-- - push_gesendet: was schon raus ist (nie doppelt), nur Service-Rolle.
-- - Versand: jede Minute ruft pg_cron (über pg_net) /api/push/senden auf –
--   nur wenn beide Erweiterungen da sind; sonst bleibt alles wie bisher
--   (Mitteilungen, solange die App offen ist).

create table if not exists public.push_abos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) <= 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_abos_household on public.push_abos (household_id);
alter table public.push_abos enable row level security;

drop policy if exists push_abos_select on public.push_abos;
create policy push_abos_select on public.push_abos for select to authenticated using (user_id = auth.uid());
drop policy if exists push_abos_insert on public.push_abos;
create policy push_abos_insert on public.push_abos for insert to authenticated
  with check (user_id = auth.uid() and (household_id is null or household_id = public.my_household()));
drop policy if exists push_abos_update on public.push_abos;
create policy push_abos_update on public.push_abos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (household_id is null or household_id = public.my_household()));
drop policy if exists push_abos_delete on public.push_abos;
create policy push_abos_delete on public.push_abos for delete to authenticated using (user_id = auth.uid());

revoke all on public.push_abos from anon, authenticated;
grant select, delete on public.push_abos to authenticated;
grant insert (household_id, endpoint, p256dh, auth, settings) on public.push_abos to authenticated;
grant update (household_id, p256dh, auth, settings, updated_at) on public.push_abos to authenticated;

create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  vapid_public text not null,
  vapid_private text not null,
  cron_token text not null,
  base_url text,
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create table if not exists public.push_gesendet (
  key text not null,
  abo_id uuid not null references public.push_abos (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (key, abo_id)
);
alter table public.push_gesendet enable row level security;
revoke all on public.push_gesendet from anon, authenticated;

-- Versand jede Minute – nur mit pg_cron und pg_net (Supabase: Erweiterungen)
do $$
begin
  begin
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron/pg_net nicht verfügbar – Server-Versand bleibt aus';
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'mia-push-senden';
    perform cron.schedule('mia-push-senden', '* * * * *', $job$
      select net.http_post(
        url := c.base_url || '/api/push/senden',
        headers := jsonb_build_object('authorization', 'Bearer ' || c.cron_token, 'content-type', 'application/json'),
        body := '{}'::jsonb
      ) from public.push_config c where c.base_url is not null
    $job$);
  end if;
exception when others then
  raise notice 'Zeitplan für Push nicht angelegt: %', sqlerrm;
end;
$$;
