-- Dashboard v2: events carry their real time (a backdated visit logs at its visit time) and stamps say
-- where the card stood ("5 of 8"), and one function returns every Home number for a 7/30/90-day range.

-- ---------- the log ----------

drop function private.log_card_event(uuid, uuid, text, text, text);
create function private.log_card_event(
  p_venue uuid, p_customer uuid, p_kind text, p_source text, p_detail text default null, p_at timestamptz default now()
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  insert into public.card_events (venue_id, customer_id, kind, source, actor, actor_email, detail, created_at)
  values (p_venue, p_customer, p_kind, case when uid is null then p_source else 'staff' end, uid,
    (select email from auth.users where id = uid), p_detail, p_at);
end;
$$;
revoke execute on function private.log_card_event(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;

-- "5 of 8" (stamps) or "320 points" after a visit, for the activity feed.
create function private.card_line(p_customer uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when p ->> 'reward_type' = 'stamps'
    then (p ->> 'stamps') || ' of ' || (p ->> 'stamps_needed')
    else (p ->> 'points') || ' points' end
  from (select private.customer_progress(p_customer) as p) x;
$$;
revoke execute on function private.card_line(uuid) from public, anon, authenticated;

create or replace function private.log_visit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('bayline.redemption_visit', true), '') <> '1' then
      perform private.log_card_event(new.venue_id, new.customer_id, case when new.stamp then 'stamp' else 'visit' end,
        case when new.source = 'staff' then 'staff' else 'customer' end,
        case when new.stamp then private.card_line(new.customer_id) end, new.visited_at);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.stamp and not new.stamp then
      perform private.log_card_event(new.venue_id, new.customer_id, 'stamp_removed', 'staff', private.card_line(new.customer_id));
    end if;
  elsif exists (select 1 from public.customers where id = old.customer_id) then
    perform private.log_card_event(old.venue_id, old.customer_id, 'visit_deleted', 'staff');
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.log_reward_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_card_event(new.venue_id, new.customer_id, case when new.kind = 'main' then 'redeem' else 'milestone' end,
      'staff', new.reward_text, new.redeemed_at);
  elsif exists (select 1 from public.customers where id = old.customer_id) then
    perform private.log_card_event(old.venue_id, old.customer_id, 'reward_undone', 'staff', old.reward_text);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.log_customer_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_card_event(new.venue_id, new.id, 'joined', 'customer', null, new.created_at);
  else
    if new.card_reset_at is distinct from old.card_reset_at and new.card_reset_at is not null then
      perform private.log_card_event(new.venue_id, new.id, 'card_reset', 'staff');
    end if;
    if new.bonus_stamps < old.bonus_stamps then
      perform private.log_card_event(new.venue_id, new.id, 'stamp_removed', 'staff');
    end if;
  end if;
  return new;
end;
$$;

-- ---------- home ----------

-- Every Home number for the last p_days days (7, 30 or 90) against the p_days before, venue time zone.
-- Active customers: anyone with a visit in the range. New members: first visit in the range. Earned
-- rewards: redeemed in the range plus cards ready now.
create function public.venue_dashboard(p_venue uuid, p_days int) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (
    select v.timezone, v.reward_type, v.stamps_needed, v.points_needed,
      (now() at time zone v.timezone)::date as today
    from public.venues v where v.id = p_venue
  ),
  r as (select today - (p_days - 1) as cur, today - (2 * p_days - 1) as prev, today from ve),
  vis as (
    select (v.visited_at at time zone ve.timezone)::date as d, v.customer_id
    from public.visits v, ve
    where v.venue_id = p_venue and v.visited_at > now() - make_interval(days => 2 * p_days + 1)
  ),
  firsts as (
    select (min(v.visited_at) at time zone (select timezone from ve))::date as d
    from public.visits v where v.venue_id = p_venue group by v.customer_id
  ),
  red as (
    select (rr.redeemed_at at time zone ve.timezone)::date as d
    from public.rewards_redeemed rr, ve
    where rr.venue_id = p_venue and rr.kind = 'main' and rr.redeemed_at > now() - make_interval(days => 2 * p_days + 1)
  ),
  ready as (
    select count(*)::int as n from public.customer_stats s, ve
    where s.venue_id = p_venue
      and case when ve.reward_type = 'stamps' then s.stamps >= ve.stamps_needed else s.points >= ve.points_needed end
  ),
  series as (
    select jsonb_agg(jsonb_build_object('d', g.d, 'n', coalesce(c.n, 0)) order by g.d) as j
    from (select generate_series(r.cur, r.today, interval '1 day')::date as d from r) g
    left join (select d, count(*)::int as n from vis group by d) c on c.d = g.d
  ),
  counts as (
    select private.label_counts(p_venue, now()) as now_c,
      private.label_counts(p_venue, now() - make_interval(days => p_days)) as prev_c
  )
  select jsonb_build_object(
    'days', p_days,
    'visits', (select count(*) from vis, r where d >= r.cur),
    'prev_visits', (select count(*) from vis, r where d >= r.prev and d < r.cur),
    'active', (select count(distinct customer_id) from vis, r where d >= r.cur),
    'prev_active', (select count(distinct customer_id) from vis, r where d >= r.prev and d < r.cur),
    'new', (select count(*) from firsts, r where firsts.d >= r.cur),
    'prev_new', (select count(*) from firsts, r where firsts.d >= r.prev and firsts.d < r.cur),
    'slipping', (select (now_c ->> 'slipping')::int from counts),
    'prev_slipping', (select (prev_c ->> 'slipping')::int from counts),
    'regulars', (select (now_c ->> 'regulars')::int from counts),
    'redeemed', (select count(*) from red, r where red.d >= r.cur),
    'ready', (select n from ready),
    'series', (select coalesce(j, '[]'::jsonb) from series)
  );
$$;
revoke execute on function public.venue_dashboard(uuid, int) from public, anon;
grant execute on function public.venue_dashboard(uuid, int) to authenticated, service_role;
