-- Marketing-site events (button clicks, demo joins from the site). Written by the server only.
create table public.site_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('try_it_click', 'book_call_click', 'demo_join_site')),
  path text check (path is null or char_length(path) <= 200),
  created_at timestamptz not null default now()
);
create index site_events_time on public.site_events (event, created_at desc);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant all on public.site_events to service_role;
