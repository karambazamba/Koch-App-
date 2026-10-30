-- Erinnerungen auch bei geschlossener App – zuverlässig und nachprüfbar
-- (A-069). Baut auf 20261027120000_push.sql auf, wiederholbar.
-- 1. Erweiterungen so, wie Supabase sie erwartet: pg_net im Schema
--    „extensions“, pg_cron normal. Klappt das nicht (Rechte), bleibt es bei
--    einer Notiz – der Status in der App zeigt dann „nein“ und die Anleitung.
-- 2. push_laeufe: jeder Versand-Lauf (Zeit, Zahl der Abos, gesendet,
--    Fehler) – nur Technik-Zahlen, nur Service-Rolle. Für „letzter Lauf vor
--    weniger als 5 Min“.
-- 3. push_protokoll: je Versand Zeit, Art (erinnerung, test, pinnwand …) und
--    Status – nie Inhalt. Nur Service-Rolle; die App sieht es über
--    /api/push/protokoll nur für den eigenen Haushalt. 7 Tage.
-- 4. push_tests: „Test: in 1 Minute erinnern“ – Abo und Fälligkeit, sonst
--    nichts. Nur Service-Rolle.
-- 5. push_cron_status(): sind pg_cron, pg_net und der Zeitplan da? Nur für
--    die Service-Rolle.
-- 6. Zeitplan „mia-push-senden“ jede Minute neu anlegen.

do $$
begin
  begin
    create extension if not exists pg_net with schema extensions;
  exception when others then
    raise notice 'pg_net nicht verfügbar: %', sqlerrm;
  end;
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron nicht verfügbar: %', sqlerrm;
  end;
end;
$$;

create table if not exists public.push_laeufe (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  abos int not null default 0 check (abos >= 0),
  gesendet int not null default 0 check (gesendet >= 0),
  fehler int not null default 0 check (fehler >= 0)
);
create index if not exists push_laeufe_at on public.push_laeufe (at desc);
alter table public.push_laeufe enable row level security;
revoke all on public.push_laeufe from anon, authenticated;

create table if not exists public.push_protokoll (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  household_id uuid references public.households (id) on delete cascade,
  art text not null check (char_length(art) between 1 and 30),
  status text not null check (status in ('gesendet', 'abgelaufen', 'fehler'))
);
create index if not exists push_protokoll_haushalt on public.push_protokoll (household_id, at desc);
alter table public.push_protokoll enable row level security;
revoke all on public.push_protokoll from anon, authenticated;

create table if not exists public.push_tests (
  id uuid primary key default gen_random_uuid(),
  abo_id uuid not null references public.push_abos (id) on delete cascade,
  faellig timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.push_tests enable row level security;
revoke all on public.push_tests from anon, authenticated;

create or replace function public.push_cron_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  hat_cron boolean := exists (select 1 from pg_extension where extname = 'pg_cron');
  hat_net boolean := exists (select 1 from pg_extension where extname = 'pg_net');
  job boolean := false;
begin
  if hat_cron then
    execute 'select exists (select 1 from cron.job where jobname = ''mia-push-senden'' and active)' into job;
  end if;
  return jsonb_build_object(
    'cron', hat_cron,
    'net', hat_net,
    'job', job,
    'ziel', exists (select 1 from public.push_config where id = 1 and base_url like 'https://%')
  );
end;
$$;
revoke all on function public.push_cron_status() from public, anon, authenticated;
grant execute on function public.push_cron_status() to service_role;

do $$
begin
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
