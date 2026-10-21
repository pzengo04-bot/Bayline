-- Numbers for the dashboard home, in the venue's own time zone. Runs with the caller's rights.
create function public.venue_home(p_venue uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (
    select timezone,
      (date_trunc('month', now() at time zone timezone) at time zone timezone) as month_start,
      ((now() at time zone timezone)::date - 6) as week_start_date
    from public.venues where id = p_venue
  ),
  month_customers as (
    select distinct v.customer_id from public.visits v, ve
    where v.venue_id = p_venue and v.visited_at >= ve.month_start
  ),
  firsts as (
    select customer_id, min(visited_at) as first_at from public.visits where venue_id = p_venue group by customer_id
  ),
  week as (
    select v.*, (v.visited_at at time zone ve.timezone)::date as day
    from public.visits v, ve
    where v.venue_id = p_venue and (v.visited_at at time zone ve.timezone)::date >= ve.week_start_date
  ),
  best as (
    select day, count(*) as n from week group by day order by n desc, day desc limit 1
  )
  select jsonb_build_object(
    'month_customers', (select count(*) from month_customers),
    'month_returning', (select count(*) from month_customers m join firsts f using (customer_id), ve where f.first_at < ve.month_start),
    'week_visits', (select count(*) from week),
    'week_new', (select count(*) from firsts f, ve where (f.first_at at time zone ve.timezone)::date >= ve.week_start_date),
    'week_rewards', (select count(*) from public.rewards_redeemed r, ve
                     where r.venue_id = p_venue and (r.redeemed_at at time zone ve.timezone)::date >= ve.week_start_date),
    'best_day', (select jsonb_build_object('date', day, 'visits', n) from best)
  );
$$;
revoke execute on function public.venue_home(uuid) from public, anon;
grant execute on function public.venue_home(uuid) to authenticated, service_role;
