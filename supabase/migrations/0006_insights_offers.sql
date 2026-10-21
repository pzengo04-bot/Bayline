-- Phase 2a: customer rhythm + labels, offers sent to wallet passes, demo guests.

-- ---------- settings ----------

alter table public.venues
  add column is_demo boolean not null default false,
  -- Optional opening hours (local time, 0–24). When set, slow-hour suggestions stay inside them.
  add column open_hour int check (open_hour is null or open_hour between 0 and 23),
  add column close_hour int check (close_hour is null or close_hour between 1 and 24),
  -- A customer gets at most one offer per this many days (demo venue ignores it).
  add column offer_cooldown_days int not null default 7 check (offer_cooldown_days between 1 and 60);
grant update (open_hour, close_hour, offer_cooldown_days) on public.venues to authenticated;

-- Fake customers created by the seed script (demo data). Real joiners are false.
alter table public.customers add column is_seed boolean not null default false;
grant select (is_seed) on public.customers to authenticated;

-- ---------- rhythm + labels ----------

-- One row per customer: visits in the last 180/90 days, last visit, rhythm (median days between
-- visits in the last 180 days, when there are 3+), days since last visit (calendar days, venue
-- time zone) and exactly one label. Computed on read from visits; nothing stored per tap.
create view public.customer_insights with (security_invoker = true) as
with agg as (
  select
    c.id,
    c.venue_id,
    c.name,
    c.phone,
    c.created_at,
    c.is_seed,
    ve.is_demo,
    ve.timezone,
    count(vi.id)::int as visits_total,
    (count(vi.id) filter (where vi.visited_at > now() - interval '180 days'))::int as visits_180,
    (count(vi.id) filter (where vi.visited_at > now() - interval '90 days'))::int as visits_90,
    min(vi.visited_at) as first_visit_at,
    max(vi.visited_at) as last_visit_at
  from public.customers c
  join public.venues ve on ve.id = c.venue_id
  left join public.visits vi on vi.customer_id = c.id
  group by c.id, ve.id
),
gaps as (
  select customer_id, percentile_cont(0.5) within group (order by gap_days) as rhythm
  from (
    select
      customer_id,
      extract(epoch from visited_at - lag(visited_at) over (partition by customer_id order by visited_at)) / 86400.0 as gap_days
    from public.visits
    where visited_at > now() - interval '180 days'
  ) g
  where gap_days is not null
  group by customer_id
),
ranked as (
  select
    a.*,
    case when a.visits_180 >= 3 then round(g.rhythm::numeric, 1)::float8 end as rhythm_days,
    case when a.last_visit_at is not null then
      ((now() at time zone a.timezone)::date - (a.last_visit_at at time zone a.timezone)::date)
    end as days_since,
    row_number() over (partition by a.venue_id order by a.visits_90 desc, a.last_visit_at desc nulls last) as vip_rank,
    count(*) over (partition by a.venue_id) as venue_customers
  from agg a
  left join gaps g on g.customer_id = a.id
)
select
  id, venue_id, name, phone, created_at, is_seed, visits_total, visits_180, visits_90,
  first_visit_at, last_visit_at, rhythm_days, days_since,
  case
    when is_demo and not is_seed then 'demo_guest'
    when last_visit_at is null then 'new'
    when visits_total <= 2 and first_visit_at > now() - interval '30 days' then 'new'
    when days_since >= 120 then 'lapsed'
    when rhythm_days is not null and days_since > 2 * rhythm_days and days_since >= 14 then 'slipping'
    when visits_90 >= 5 and vip_rank <= greatest(1, ceil(venue_customers * 0.1)) then 'vip'
    when visits_180 >= 3 then 'regular'
    else 'occasional'
  end as label
from ranked;

revoke all on public.customer_insights from anon;
grant select on public.customer_insights to authenticated, service_role;

-- ---------- offers ----------

create table public.offer_sends (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  audience text not null check (audience in ('slipping', 'regulars', 'everyone', 'demo_guests')),
  message text not null check (char_length(btrim(message)) between 1 and 120),
  recipients int not null default 0, -- everyone the audience matched
  delivered int not null default 0,  -- holders of a wallet card who got it
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index offer_sends_venue_time on public.offer_sends (venue_id, created_at desc);

create table public.offer_recipients (
  send_id uuid not null references public.offer_sends (id) on delete cascade,
  customer_id uuid not null,
  venue_id uuid not null,
  status text not null check (status in ('delivered', 'no_card', 'cooldown')),
  apple boolean not null default false,
  google boolean not null default false,
  google_notified boolean not null default false,
  primary key (send_id, customer_id),
  foreign key (customer_id, venue_id) references public.customers (id, venue_id) on delete cascade
);
create index offer_recipients_customer on public.offer_recipients (customer_id, status);

alter table public.offer_sends enable row level security;
alter table public.offer_recipients enable row level security;
revoke all on public.offer_sends, public.offer_recipients from anon;
grant select, insert, update on public.offer_sends, public.offer_recipients to authenticated;
grant all on public.offer_sends, public.offer_recipients to service_role;

create policy "members read sends" on public.offer_sends for select to authenticated
  using (private.is_venue_member(venue_id));
create policy "owners send" on public.offer_sends for insert to authenticated
  with check (private.is_venue_owner(venue_id) and created_by = (select auth.uid()));
create policy "owners update sends" on public.offer_sends for update to authenticated
  using (private.is_venue_owner(venue_id)) with check (private.is_venue_owner(venue_id));
create policy "members read recipients" on public.offer_recipients for select to authenticated
  using (private.is_venue_member(venue_id));
create policy "owners add recipients" on public.offer_recipients for insert to authenticated
  with check (private.is_venue_owner(venue_id));
create policy "owners update recipients" on public.offer_recipients for update to authenticated
  using (private.is_venue_owner(venue_id)) with check (private.is_venue_owner(venue_id));

-- Each send with how many recipients have tapped since ("came back").
create view public.offer_send_results with (security_invoker = true) as
select
  s.*,
  (select count(*)::int from public.offer_recipients r
    where r.send_id = s.id and r.status = 'delivered'
      and exists (select 1 from public.visits v where v.customer_id = r.customer_id and v.visited_at > s.created_at)
  ) as came_back
from public.offer_sends s;
revoke all on public.offer_send_results from anon;
grant select on public.offer_send_results to authenticated, service_role;

-- ---------- voided passes (cleared demo guests) ----------

-- When demo guests are cleared, their passes are voided before the customer rows go. This keeps just
-- enough for Apple's web service to serve the final "voided" pass to their iPhone.
create table public.voided_passes (
  serial uuid primary key,
  venue_id uuid references public.venues (id) on delete cascade,
  apple_auth_token text not null,
  pass_data jsonb not null,
  voided_at timestamptz not null default now()
);
alter table public.voided_passes enable row level security;
revoke all on public.voided_passes from anon, authenticated;
grant all on public.voided_passes to service_role;

-- Registrations must outlive the customer row long enough to deliver the voided pass.
alter table public.apple_registrations drop constraint apple_registrations_serial_number_fkey;

-- ---------- pass data: latest offer ----------

create or replace function public.wallet_pass_data(p_serial uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customer_id', c.id,
    'serial', c.pass_serial,
    'first_name', split_part(c.name, ' ', 1),
    'apple_auth_token', c.apple_auth_token,
    'updated_at', c.pass_updated_at,
    'venue', jsonb_build_object(
      'id', v.id, 'name', v.name, 'slug', v.slug, 'logo_url', v.logo_url,
      'card_bg', v.card_bg, 'card_fg', v.card_fg, 'card_accent', v.card_accent,
      'pass_message', v.pass_message, 'reward_type', v.reward_type, 'reward_text', v.reward_text
    ),
    'progress', private.customer_progress(c.id),
    'offer', (
      select jsonb_build_object('text', s.message, 'sent_at', s.created_at)
      from public.offer_recipients r join public.offer_sends s on s.id = r.send_id
      where r.customer_id = c.id and r.status = 'delivered'
      order by s.created_at desc limit 1
    )
  )
  from public.customers c join public.venues v on v.id = c.venue_id
  where c.pass_serial = p_serial;
$$;
revoke execute on function public.wallet_pass_data(uuid) from public, anon, authenticated;
grant execute on function public.wallet_pass_data(uuid) to service_role;
