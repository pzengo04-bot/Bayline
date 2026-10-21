-- Server-side log of wallet traffic (pushes and Apple web-service calls) for diagnosing updates.
-- No secrets: push tokens are truncated, auth tokens never stored. Kept 30 days by convention.
create table public.wallet_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  serial uuid,
  event text not null,
  status int,
  detail text
);
create index wallet_events_time on public.wallet_events (created_at desc);
alter table public.wallet_events enable row level security;
revoke all on public.wallet_events from anon, authenticated;
grant all on public.wallet_events to service_role;
