-- Read models for the owner dashboard and functions for the staff desk tools.
-- Views and invoker functions run with the caller's rights, so Row Level Security still applies.
-- Definer functions check venue membership themselves before doing anything.

-- One row per customer with visit totals and reward progress.
create view public.customer_stats with (security_invoker = true) as
select
  c.id,
  c.venue_id,
  c.name,
  c.phone,
  c.text_consent,
  c.consent_timestamp,
  c.created_at,
  count(v.id)::int as visits,
  coalesce(sum(v.amount), 0)::float8 as spend,
  count(v.amount)::int as visits_with_amount,
  min(v.visited_at) as first_visit_at,
  max(v.visited_at) as last_visit_at,
  (count(v.id) filter (where v.visited_at > now() - interval '60 days'))::int as visits_60d,
  (count(v.id) filter (where v.visited_at > coalesce(r.last_reward_at, '-infinity'::timestamptz)))::int as stamps,
  (coalesce(sum(v.points), 0) - r.points_spent)::int as points,
  r.rewards_count::int as rewards
from public.customers c
left join public.visits v on v.customer_id = c.id
left join lateral (
  select max(redeemed_at) as last_reward_at, coalesce(sum(points_spent), 0) as points_spent, count(*) as rewards_count
  from public.rewards_redeemed where customer_id = c.id
) r on true
group by c.id, r.last_reward_at, r.points_spent, r.rewards_count;

revoke all on public.customer_stats from anon;
grant select on public.customer_stats to authenticated;

-- Headline numbers. "This month" follows the venue's own time zone.
create function public.venue_overview(p_venue uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (
    select (date_trunc('month', now() at time zone timezone) at time zone timezone) as month_start
    from public.venues where id = p_venue
  ),
  active as (
    select customer_id, count(*) as n from public.visits
    where venue_id = p_venue and visited_at > now() - interval '60 days'
    group by customer_id
  )
  select jsonb_build_object(
    'active_customers', (select count(*) from active),
    'repeat_customers', (select count(*) from active where n >= 2),
    'visits_this_month', (select count(*) from public.visits, ve where venue_id = p_venue and visited_at >= ve.month_start),
    'rewards_this_month', (select count(*) from public.rewards_redeemed, ve where venue_id = p_venue and redeemed_at >= ve.month_start)
  );
$$;

-- Check-ins by local day of week (0 = Monday) and hour over the last p_days days.
create function public.visit_heatmap(p_venue uuid, p_days int default 56)
returns table (dow int, hour int, visits int)
language sql stable security invoker set search_path = '' as $$
  select
    (extract(isodow from v.visited_at at time zone ve.timezone)::int - 1) as dow,
    extract(hour from v.visited_at at time zone ve.timezone)::int as hour,
    count(*)::int as visits
  from public.visits v
  join public.venues ve on ve.id = v.venue_id
  where v.venue_id = p_venue and v.visited_at > now() - make_interval(days => p_days)
  group by 1, 2;
$$;

-- Admin list: size and recent activity of every venue the caller can see.
create function public.venue_activity()
returns table (venue_id uuid, customers int, visits_30d int, last_visit_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select
    ve.id,
    (select count(*)::int from public.customers c where c.venue_id = ve.id),
    (select count(*)::int from public.visits v where v.venue_id = ve.id and v.visited_at > now() - interval '30 days'),
    (select max(visited_at) from public.visits v where v.venue_id = ve.id)
  from public.venues ve;
$$;

-- Staff desk: find a customer by phone.
create function public.lookup_customer(p_venue uuid, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cust public.customers;
begin
  if not private.is_venue_member(p_venue) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  select * into cust from public.customers where venue_id = p_venue and phone = p_phone;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', cust.id,
    'name', cust.name,
    'phone', cust.phone,
    'text_consent', cust.text_consent,
    'visits', (select count(*) from public.visits where customer_id = cust.id),
    'last_visit_at', (select max(visited_at) from public.visits where customer_id = cust.id),
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- Staff desk: record a visit (with the amount spent, for points venues). Creates the customer if
-- the phone is new and a name is given. Staff can't give text consent on a customer's behalf.
create function public.add_visit(p_venue uuid, p_phone text, p_amount numeric default null, p_name text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
  rewards_before int;
  rewards_after int;
begin
  if not private.is_venue_member(p_venue) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  if p_phone is null or p_phone !~ '^\+1[2-9][0-9]{9}$' then
    raise exception 'Invalid phone number' using errcode = '22023';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount >= 100000) then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_venue::text || p_phone, 0));
  select * into cust from public.customers where venue_id = p_venue and phone = p_phone;
  if not found then
    if p_name is null or char_length(btrim(p_name)) = 0 then
      raise exception 'New customer needs a name' using errcode = '22023';
    end if;
    insert into public.customers (venue_id, name, phone) values (p_venue, left(btrim(p_name), 60), p_phone)
    returning * into cust;
  end if;

  select count(*) into rewards_before from public.rewards_redeemed where customer_id = cust.id;
  insert into public.visits (venue_id, customer_id, amount, source) values (p_venue, cust.id, p_amount, 'staff');
  select count(*) into rewards_after from public.rewards_redeemed where customer_id = cust.id;

  return jsonb_build_object(
    'customer_id', cust.id,
    'name', cust.name,
    'reward_unlocked', rewards_after > rewards_before,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- Staff desk: spend a points customer's points on their reward.
create function public.redeem_points_reward(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
  v public.venues;
  progress jsonb;
begin
  select * into cust from public.customers where id = p_customer;
  if not found or not private.is_venue_member(cust.venue_id) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  select * into v from public.venues where id = cust.venue_id;
  perform pg_advisory_xact_lock(hashtextextended(cust.venue_id::text || cust.phone, 0));
  progress := private.customer_progress(cust.id);
  if v.reward_type <> 'points' or (progress ->> 'points')::int < v.points_needed then
    raise exception 'Not enough points for a reward' using errcode = '22023';
  end if;
  insert into public.rewards_redeemed (venue_id, customer_id, reward_text, points_spent)
  values (v.id, cust.id, v.reward_text, v.points_needed);
  return private.customer_progress(cust.id);
end;
$$;

revoke execute on function public.venue_overview(uuid), public.visit_heatmap(uuid, int), public.venue_activity(),
  public.lookup_customer(uuid, text), public.add_visit(uuid, text, numeric, text), public.redeem_points_reward(uuid)
  from public, anon;
grant execute on function public.venue_overview(uuid), public.visit_heatmap(uuid, int), public.venue_activity(),
  public.lookup_customer(uuid, text), public.add_visit(uuid, text, numeric, text), public.redeem_points_reward(uuid)
  to authenticated;
