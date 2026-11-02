-- Scan and redeem: a random code on each card for staff to scan, the full-card and redemption rules,
-- manual stamp changes, and a log of every card change with the account that made it.
--
-- Rules: one stamp per card per day (venues.stamps_per_day; the demo venue has no limit). A full card
-- earns no more stamps: a tap shows "reward ready" instead. Redeeming starts a new card at 0, and the
-- redemption counts as that day's visit, so it can't also earn a stamp.

-- ---------- cards ----------

-- 16 random hex characters (64 bits from a v4 UUID, skipping its fixed version and variant digits).
create function private.new_card_code() returns text
language sql volatile set search_path = '' as $$
  select upper(substr(u, 1, 12) || substr(u, 14, 3) || substr(u, 18, 1))
  from (select replace(gen_random_uuid()::text, '-', '') as u) x;
$$;
grant execute on function private.new_card_code() to authenticated, service_role;

alter table public.customers
  -- What the card's QR code holds. Not derived from anything, so it can't be guessed from a member number.
  add column card_code text not null unique default private.new_card_code() check (card_code ~ '^[0-9A-F]{16}$'),
  -- Staff reset the card: stamps count from here (like a main reward, but without one).
  add column card_reset_at timestamptz;
grant select (card_code, card_reset_at) on public.customers to authenticated;

-- A visit that earned no stamp: a tap on a full card, or the visit a reward was redeemed on. It still
-- counts as a visit everywhere else (insights, busy hours).
alter table public.visits add column stamp boolean not null default true;

create trigger visits_touch_pass_update after update of stamp on public.visits
  for each row execute function private.touch_pass();

alter table public.taps drop constraint taps_result_check;
alter table public.taps add constraint taps_result_check
  check (result in ('joined', 'stamped', 'limit_reached', 'need_details', 'reward_ready'));

-- ---------- progress ----------

-- A card cycle starts at the last main reward or card reset. Head-start stamps count only on the very
-- first card. Only visits that earned a stamp count.
create or replace function private.customer_progress(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select cu.id, cu.bonus_stamps, cu.card_reset_at, v.reward_type, v.stamps_needed, v.points_needed, v.reward_text,
      v.milestone_text, v.milestone_at
    from public.customers cu join public.venues v on v.id = cu.venue_id
    where cu.id = p_customer
  ),
  r as (
    select max(rr.redeemed_at) filter (where rr.kind = 'main') as last_main,
      coalesce(sum(rr.points_spent), 0) as spent
    from c left join public.rewards_redeemed rr on rr.customer_id = c.id
  ),
  cyc as (
    select coalesce(greatest(r.last_main, c.card_reset_at), '-infinity'::timestamptz) as start,
      r.last_main is null and c.card_reset_at is null as first_card
    from c, r
  ),
  p as (
    select
      ((select count(*) from public.visits vi where vi.customer_id = c.id and vi.stamp and vi.visited_at > cyc.start)
        + case when cyc.first_card then c.bonus_stamps else 0 end)::int as stamps,
      ((select coalesce(sum(points), 0) from public.visits where customer_id = c.id) - r.spent)::int as points,
      exists (select 1 from public.rewards_redeemed m where m.customer_id = c.id and m.kind = 'milestone'
        and m.redeemed_at > cyc.start) as milestone_redeemed
    from c, r, cyc
  )
  select jsonb_build_object(
    'reward_type', c.reward_type,
    'reward_text', c.reward_text,
    'stamps', least(p.stamps, c.stamps_needed),
    'stamps_needed', c.stamps_needed,
    'points', p.points,
    'points_needed', c.points_needed,
    'reward_ready', case when c.reward_type = 'stamps' then p.stamps >= c.stamps_needed else p.points >= c.points_needed end,
    'milestone', case
      when c.milestone_at is not null
        and c.milestone_at < case when c.reward_type = 'stamps' then c.stamps_needed else c.points_needed end
      then jsonb_build_object(
        'at', c.milestone_at,
        'text', c.milestone_text,
        'redeemed', p.milestone_redeemed,
        'ready', not p.milestone_redeemed
          and case when c.reward_type = 'stamps' then p.stamps else p.points end >= c.milestone_at
      )
    end
  )
  from c, p;
$$;

create or replace view public.customer_stats with (security_invoker = true) as
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
  ((count(v.id) filter (where v.stamp
      and v.visited_at > coalesce(greatest(r.last_reward_at, c.card_reset_at), '-infinity'::timestamptz)))
    + case when r.last_reward_at is null and c.card_reset_at is null then c.bonus_stamps else 0 end)::int as stamps,
  (coalesce(sum(v.points), 0) - r.points_spent)::int as points,
  r.rewards_count::int as rewards
from public.customers c
left join public.visits v on v.customer_id = c.id
left join lateral (
  select max(redeemed_at) filter (where kind = 'main') as last_reward_at,
    coalesce(sum(points_spent), 0) as points_spent, count(*) as rewards_count
  from public.rewards_redeemed where customer_id = c.id
) r on true
group by c.id, r.last_reward_at, r.points_spent, r.rewards_count;

-- ---------- the log ----------

create table public.card_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind text not null check (kind in (
    'joined', 'stamp', 'visit', 'redeem', 'milestone', 'stamp_removed', 'card_reset', 'visit_deleted', 'reward_undone'
  )),
  -- customer: their own tap. staff: someone signed in to the dashboard (actor says who).
  source text not null check (source in ('customer', 'staff')),
  actor uuid references auth.users (id) on delete set null,
  actor_email text, -- kept so the history still says who after an account is removed
  detail text, -- the reward, for redemptions
  created_at timestamptz not null default now()
);
create index card_events_venue_time on public.card_events (venue_id, created_at desc);
create index card_events_customer_time on public.card_events (customer_id, created_at desc);
alter table public.card_events enable row level security;
create policy "members read card events" on public.card_events for select to authenticated
  using (private.is_venue_member(venue_id));
-- Written only by the triggers below; nobody inserts or edits the log directly.
revoke all on public.card_events from anon, authenticated;
grant select on public.card_events to authenticated;
grant all on public.card_events to service_role;

create function private.log_card_event(p_venue uuid, p_customer uuid, p_kind text, p_source text, p_detail text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  insert into public.card_events (venue_id, customer_id, kind, source, actor, actor_email, detail)
  values (p_venue, p_customer, p_kind, case when uid is null then p_source else 'staff' end, uid,
    (select email from auth.users where id = uid), p_detail);
end;
$$;
revoke execute on function private.log_card_event(uuid, uuid, text, text, text) from public, anon, authenticated;

create function private.log_visit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- The visit a reward is redeemed on is logged as the redemption itself.
    if coalesce(current_setting('bayline.redemption_visit', true), '') <> '1' then
      perform private.log_card_event(new.venue_id, new.customer_id, case when new.stamp then 'stamp' else 'visit' end,
        case when new.source = 'staff' then 'staff' else 'customer' end);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.stamp and not new.stamp then
      perform private.log_card_event(new.venue_id, new.customer_id, 'stamp_removed', 'staff');
    end if;
  -- Skip deletes that come from removing the customer (the log goes with them).
  elsif exists (select 1 from public.customers where id = old.customer_id) then
    perform private.log_card_event(old.venue_id, old.customer_id, 'visit_deleted', 'staff');
  end if;
  return coalesce(new, old);
end;
$$;
create trigger visits_log after insert or update of stamp or delete on public.visits
  for each row execute function private.log_visit_change();

create function private.log_reward_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_card_event(new.venue_id, new.customer_id, case when new.kind = 'main' then 'redeem' else 'milestone' end,
      'staff', new.reward_text);
  elsif exists (select 1 from public.customers where id = old.customer_id) then
    perform private.log_card_event(old.venue_id, old.customer_id, 'reward_undone', 'staff', old.reward_text);
  end if;
  return coalesce(new, old);
end;
$$;
create trigger rewards_log after insert or delete on public.rewards_redeemed
  for each row execute function private.log_reward_change();

create function private.log_customer_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_card_event(new.venue_id, new.id, 'joined', 'customer');
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
create trigger customers_log_insert after insert on public.customers
  for each row execute function private.log_customer_change();
create trigger customers_log_update after update of card_reset_at, bonus_stamps on public.customers
  for each row execute function private.log_customer_change();

-- History so far. Joins date from the first visit when that's earlier (sample data is backdated).
insert into public.card_events (venue_id, customer_id, kind, source, created_at)
select c.venue_id, c.id, 'joined', 'customer', least(c.created_at, (select min(visited_at) from public.visits where customer_id = c.id))
from public.customers c;
insert into public.card_events (venue_id, customer_id, kind, source, created_at)
select venue_id, customer_id, 'stamp', case when source = 'staff' then 'staff' else 'customer' end, visited_at
from public.visits;
insert into public.card_events (venue_id, customer_id, kind, source, detail, created_at)
select venue_id, customer_id, case when kind = 'main' then 'redeem' else 'milestone' end, 'staff', reward_text, redeemed_at
from public.rewards_redeemed;

-- ---------- stamping ----------

-- The one place a stamp is given. Returns stamped, limit_reached or reward_ready. On a tap, a full
-- card still records the day's visit (with no stamp). The caller holds the customer's lock.
create function private.give_stamp(p_customer uuid, p_source public.visit_source, p_amount numeric, p_tap boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
  today int;
begin
  select ve.* into v from public.venues ve join public.customers c on c.venue_id = ve.id where c.id = p_customer;
  select count(*) into today from public.visits
  where customer_id = p_customer
    and (visited_at at time zone v.timezone)::date = (now() at time zone v.timezone)::date;

  if v.reward_type = 'stamps' and (private.customer_progress(p_customer) ->> 'reward_ready')::boolean then
    if p_tap and today = 0 then
      insert into public.visits (venue_id, customer_id, source, stamp) values (v.id, p_customer, p_source, false);
    end if;
    return 'reward_ready';
  end if;
  if v.stamps_per_day is not null and today >= v.stamps_per_day then
    return 'limit_reached';
  end if;
  insert into public.visits (venue_id, customer_id, amount, source) values (v.id, p_customer, p_amount, p_source);
  return 'stamped';
end;
$$;
revoke execute on function private.give_stamp(uuid, public.visit_source, numeric, boolean) from public, anon, authenticated;

create or replace function public.tap(
  p_slug text,
  p_source text default 'web',
  p_return_token uuid default null,
  p_phone text default null,
  p_name text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
  cust public.customers;
  src text := case when p_source in ('nfc', 'qr', 'web') then p_source else 'web' end;
  joined boolean := false;
  bonus int := 0;
  result text;
begin
  select * into v from public.venues where slug = p_slug;
  if not found then
    return jsonb_build_object('status', 'venue_not_found');
  end if;

  if p_return_token is not null then
    select * into cust from public.customers where venue_id = v.id and return_token = p_return_token;
  end if;

  if cust.id is null then
    if p_phone is null then
      insert into public.taps (venue_id, source, result) values (v.id, src, 'need_details');
      return jsonb_build_object('status', 'need_details');
    end if;
    if p_phone !~ '^\+1[2-9][0-9]{9}$' then
      return jsonb_build_object('status', 'invalid_phone');
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v.id::text || p_phone, 0));
    select * into cust from public.customers where venue_id = v.id and phone = p_phone;
    if not found then
      if p_name is null or char_length(btrim(p_name)) = 0 then
        return jsonb_build_object('status', 'need_name');
      end if;
      bonus := case when v.reward_type = 'stamps' then v.head_start_stamps else 0 end;
      insert into public.customers (venue_id, name, phone, bonus_stamps) values (v.id, left(btrim(p_name), 60), p_phone, bonus)
      returning * into cust;
      joined := true;
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(v.id::text || cust.phone, 0));
  end if;

  result := private.give_stamp(cust.id, 'qr', null, true);
  if joined and result = 'stamped' then
    result := 'joined';
  end if;
  insert into public.taps (venue_id, customer_id, source, result) values (v.id, cust.id, src, result);

  return jsonb_build_object(
    'status', result,
    'first_name', split_part(cust.name, ' ', 1),
    'customer_id', cust.id,
    'return_token', cust.return_token,
    'pass_serial', cust.pass_serial,
    'head_start', bonus,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- ---------- staff ----------

-- Everything the scan screen and profile need about one card.
create function public.card_status(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cust public.customers;
  v public.venues;
  today int;
begin
  select * into cust from public.customers where id = p_customer;
  if not found or not private.is_venue_member(cust.venue_id) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  select * into v from public.venues where id = cust.venue_id;
  select count(*) into today from public.visits
  where customer_id = cust.id and (visited_at at time zone v.timezone)::date = (now() at time zone v.timezone)::date;
  return jsonb_build_object(
    'id', cust.id,
    'name', cust.name,
    'phone', cust.phone,
    'text_consent', cust.text_consent,
    'created_at', cust.created_at,
    'visits', (select count(*) from public.visits where customer_id = cust.id),
    'last_visit_at', (select max(visited_at) from public.visits where customer_id = cust.id),
    'stamped_today', v.stamps_per_day is not null and today >= v.stamps_per_day,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- The card behind a scanned code. other_venue: a real Bayline card, but for a different business.
create function public.find_card(p_venue uuid, p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cust public.customers;
begin
  if not private.is_venue_member(p_venue) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  select * into cust from public.customers where card_code = upper(btrim(p_code));
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if cust.venue_id <> p_venue then
    return jsonb_build_object('status', 'other_venue');
  end if;
  return jsonb_build_object('status', 'found', 'card', public.card_status(cust.id));
end;
$$;

-- Staff add a stamp (points venues: a visit, with the amount spent). result: stamped, limit_reached
-- or reward_ready, with the card as it is now.
create function public.stamp_customer(p_customer uuid, p_amount numeric default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
  result text;
begin
  select * into cust from public.customers where id = p_customer;
  if not found or not private.is_venue_member(cust.venue_id) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount >= 100000) then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(cust.venue_id::text || cust.phone, 0));
  result := private.give_stamp(cust.id, 'staff', p_amount, false);
  return jsonb_build_object('result', result, 'card', public.card_status(cust.id));
end;
$$;

-- Take back the latest stamp on the current card (the visit stays, without its stamp).
create function public.remove_stamp(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
  v public.venues;
  start timestamptz;
  visit_id uuid;
begin
  select * into cust from public.customers where id = p_customer;
  if not found or not private.is_venue_member(cust.venue_id) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  select * into v from public.venues where id = cust.venue_id;
  if v.reward_type <> 'stamps' then
    raise exception 'Only stamp cards have stamps' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(cust.venue_id::text || cust.phone, 0));
  start := coalesce(greatest(
    (select max(redeemed_at) from public.rewards_redeemed where customer_id = cust.id and kind = 'main'),
    cust.card_reset_at), '-infinity'::timestamptz);
  select id into visit_id from public.visits
  where customer_id = cust.id and stamp and visited_at > start
  order by visited_at desc limit 1;
  if visit_id is not null then
    update public.visits set stamp = false where id = visit_id;
  elsif start = '-infinity'::timestamptz and cust.bonus_stamps > 0 then
    update public.customers set bonus_stamps = bonus_stamps - 1, pass_updated_at = now() where id = cust.id;
  else
    raise exception 'No stamps to remove' using errcode = '22023';
  end if;
  return public.card_status(cust.id);
end;
$$;

-- Start the card over at 0 without giving a reward.
create function public.reset_card(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
begin
  select * into cust from public.customers where id = p_customer;
  if not found or not private.is_venue_member(cust.venue_id) then
    raise exception 'Not a member of this venue' using errcode = '42501';
  end if;
  if (select reward_type from public.venues where id = cust.venue_id) <> 'stamps' then
    raise exception 'Only stamp cards can be reset' using errcode = '22023';
  end if;
  update public.customers set card_reset_at = now(), pass_updated_at = now() where id = cust.id;
  return public.card_status(cust.id);
end;
$$;

-- Redeeming also records the day's visit (without a stamp) so the same visit can't earn one after.
create or replace function public.redeem_reward(p_customer uuid, p_kind text default 'main') returns jsonb
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
  if p_kind not in ('main', 'milestone') then
    raise exception 'Unknown reward' using errcode = '22023';
  end if;
  select * into v from public.venues where id = cust.venue_id;
  perform pg_advisory_xact_lock(hashtextextended(cust.venue_id::text || cust.phone, 0));
  progress := private.customer_progress(cust.id);
  if p_kind = 'milestone' then
    if not coalesce((progress -> 'milestone' ->> 'ready')::boolean, false) then
      raise exception 'Reward not ready yet' using errcode = '22023';
    end if;
    insert into public.rewards_redeemed (venue_id, customer_id, reward_text, points_spent, kind)
    values (v.id, cust.id, v.milestone_text, 0, 'milestone');
  else
    if not (progress ->> 'reward_ready')::boolean then
      raise exception 'Reward not ready yet' using errcode = '22023';
    end if;
    insert into public.rewards_redeemed (venue_id, customer_id, reward_text, points_spent, kind)
    values (v.id, cust.id, v.reward_text, case when v.reward_type = 'points' then v.points_needed else 0 end, 'main');
    if v.reward_type = 'stamps' and not exists (
      select 1 from public.visits where customer_id = cust.id
        and (visited_at at time zone v.timezone)::date = (now() at time zone v.timezone)::date
    ) then
      perform set_config('bayline.redemption_visit', '1', true);
      insert into public.visits (venue_id, customer_id, source, stamp) values (v.id, cust.id, 'staff', false);
      perform set_config('bayline.redemption_visit', '', true);
    end if;
  end if;
  return private.customer_progress(cust.id);
end;
$$;

-- Staff desk by phone: same rules as a scan. Creates the customer if the phone is new and a name is given.
create or replace function public.add_visit(p_venue uuid, p_phone text, p_amount numeric default null, p_name text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
  result text;
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

  result := private.give_stamp(cust.id, 'staff', p_amount, false);
  return jsonb_build_object(
    'customer_id', cust.id,
    'name', cust.name,
    'result', result,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

revoke execute on function public.card_status(uuid), public.find_card(uuid, text), public.stamp_customer(uuid, numeric),
  public.remove_stamp(uuid), public.reset_card(uuid) from public, anon;
grant execute on function public.card_status(uuid), public.find_card(uuid, text), public.stamp_customer(uuid, numeric),
  public.remove_stamp(uuid), public.reset_card(uuid) to authenticated, service_role;

-- ---------- home ----------

-- How many active regulars (Regular or VIP) and slipping regulars a venue had at a moment in time:
-- the customer_insights labels, computed as of p_at. With p_at = now() it matches the view.
create function private.label_counts(p_venue uuid, p_at timestamptz) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (select timezone, is_demo from public.venues where id = p_venue),
  agg as (
    select c.id, c.is_seed,
      (count(vi.id) filter (where vi.visited_at <= p_at))::int as total,
      (count(vi.id) filter (where vi.visited_at > p_at - interval '180 days' and vi.visited_at <= p_at))::int as v180,
      (count(vi.id) filter (where vi.visited_at > p_at - interval '90 days' and vi.visited_at <= p_at))::int as v90,
      min(vi.visited_at) filter (where vi.visited_at <= p_at) as first_at,
      max(vi.visited_at) filter (where vi.visited_at <= p_at) as last_at
    from public.customers c left join public.visits vi on vi.customer_id = c.id
    where c.venue_id = p_venue and c.created_at <= p_at
    group by c.id
  ),
  gaps as (
    select customer_id, percentile_cont(0.5) within group (order by gap) as rhythm
    from (
      select customer_id,
        extract(epoch from visited_at - lag(visited_at) over (partition by customer_id order by visited_at)) / 86400.0 as gap
      from public.visits
      where venue_id = p_venue and visited_at > p_at - interval '180 days' and visited_at <= p_at
    ) g
    where gap is not null
    group by customer_id
  ),
  ranked as (
    select a.*,
      case when a.v180 >= 3 then round(g.rhythm::numeric, 1)::float8 end as rhythm_days,
      ((p_at at time zone ve.timezone)::date - (a.last_at at time zone ve.timezone)::date) as days_since,
      row_number() over (order by a.v90 desc, a.last_at desc nulls last) as vip_rank,
      count(*) over () as n
    from agg a left join gaps g on g.customer_id = a.id, ve
  ),
  labeled as (
    select case
      when ve.is_demo and not r.is_seed then 'demo_guest'
      when r.last_at is null then 'new'
      when r.total <= 2 and r.first_at > p_at - interval '30 days' then 'new'
      when r.days_since >= 120 then 'lapsed'
      when r.rhythm_days is not null and r.days_since > 2 * r.rhythm_days and r.days_since >= 14 then 'slipping'
      when r.v90 >= 5 and r.vip_rank <= greatest(1, ceil(r.n * 0.1)) then 'vip'
      when r.v180 >= 3 then 'regular'
      else 'occasional'
    end as label
    from ranked r, ve
  )
  select jsonb_build_object(
    'regulars', count(*) filter (where label in ('regular', 'vip')),
    'slipping', count(*) filter (where label = 'slipping')
  )
  from labeled;
$$;
grant execute on function private.label_counts(uuid, timestamptz) to authenticated, service_role;

-- Numbers for the dashboard home: the last 7 days against the 7 before, in the venue's time zone.
create or replace function public.venue_home(p_venue uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (
    select timezone, ((now() at time zone timezone)::date - 6) as week_start, ((now() at time zone timezone)::date - 13) as prev_start
    from public.venues where id = p_venue
  ),
  firsts as (
    select customer_id, min(visited_at) as first_at from public.visits where venue_id = p_venue group by customer_id
  ),
  days as (
    select (v.visited_at at time zone ve.timezone)::date as day from public.visits v, ve
    where v.venue_id = p_venue and v.visited_at > now() - interval '15 days'
  ),
  best as (
    select day, count(*) as n from days, ve where day >= ve.week_start group by day order by n desc, day desc limit 1
  ),
  now_counts as (select private.label_counts(p_venue, now()) as j),
  prev_counts as (select private.label_counts(p_venue, now() - interval '7 days') as j)
  select jsonb_build_object(
    'week_visits', (select count(*) from days, ve where day >= ve.week_start),
    'prev_visits', (select count(*) from days, ve where day >= ve.prev_start and day < ve.week_start),
    'regulars', (select (j ->> 'regulars')::int from now_counts),
    'prev_regulars', (select (j ->> 'regulars')::int from prev_counts),
    'slipping', (select (j ->> 'slipping')::int from now_counts),
    'prev_slipping', (select (j ->> 'slipping')::int from prev_counts),
    'week_new', (select count(*) from firsts f, ve where (f.first_at at time zone ve.timezone)::date >= ve.week_start),
    'week_rewards', (select count(*) from public.rewards_redeemed r, ve
                     where r.venue_id = p_venue and r.kind = 'main' and (r.redeemed_at at time zone ve.timezone)::date >= ve.week_start),
    'best_day', (select jsonb_build_object('date', day, 'visits', n) from best)
  );
$$;

-- The Monday brief: one Monday-to-Sunday week, against the week before.
create function public.venue_week(p_venue uuid, p_start date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ve as (select timezone from public.venues where id = p_venue),
  vis as (
    select v.customer_id, (v.visited_at at time zone ve.timezone)::date as day,
      extract(hour from v.visited_at at time zone ve.timezone)::int as hour
    from public.visits v, ve
    where v.venue_id = p_venue
      and (v.visited_at at time zone ve.timezone)::date >= p_start - 7
      and (v.visited_at at time zone ve.timezone)::date < p_start + 7
  ),
  firsts as (
    select customer_id, (min(visited_at) at time zone (select timezone from ve))::date as first_day
    from public.visits where venue_id = p_venue group by customer_id
  ),
  wk as (select * from vis where day >= p_start),
  best as (select day, count(*) as n from wk group by day order by n desc, day limit 1)
  select jsonb_build_object(
    'visits', (select count(*) from wk),
    'prev_visits', (select count(*) from vis where day < p_start),
    'customers', (select count(distinct customer_id) from wk),
    'new', (select count(*) from firsts where first_day >= p_start and first_day < p_start + 7),
    'prev_new', (select count(*) from firsts where first_day >= p_start - 7 and first_day < p_start),
    'rewards', (select count(*) from public.rewards_redeemed r, ve where r.venue_id = p_venue and r.kind = 'main'
                and (r.redeemed_at at time zone ve.timezone)::date >= p_start and (r.redeemed_at at time zone ve.timezone)::date < p_start + 7),
    'best_day', (select jsonb_build_object('date', day, 'visits', n) from best)
  );
$$;
revoke execute on function public.venue_week(uuid, date) from public, anon;
grant execute on function public.venue_week(uuid, date) to authenticated, service_role;

-- ---------- passes ----------

create or replace function public.wallet_pass_data(p_serial uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customer_id', c.id,
    'serial', c.pass_serial,
    'card_code', c.card_code,
    'first_name', split_part(c.name, ' ', 1),
    'apple_auth_token', c.apple_auth_token,
    'updated_at', c.pass_updated_at,
    'venue', jsonb_build_object(
      'id', v.id, 'name', v.name, 'slug', v.slug, 'logo_url', v.logo_url, 'logo_text', v.logo_text,
      'card_bg', v.card_bg, 'card_fg', v.card_fg, 'card_accent', v.card_accent, 'card_reward', v.card_reward,
      'pass_message', v.pass_message, 'reward_type', v.reward_type, 'reward_text', v.reward_text,
      'address', v.address, 'phone', v.phone, 'website', v.website, 'timezone', v.timezone,
      'type', v.type, 'stamp_icon', v.stamp_icon
    ),
    'progress', private.customer_progress(c.id),
    'offer', (
      select jsonb_build_object('text', s.message, 'short', s.short_text, 'sent_at', s.created_at, 'expires_at', s.expires_at)
      from public.offer_recipients r join public.offer_sends s on s.id = r.send_id
      where r.customer_id = c.id and r.status = 'delivered' and s.expires_at > now()
      order by s.created_at desc limit 1
    )
  )
  from public.customers c join public.venues v on v.id = c.venue_id
  where c.pass_serial = p_serial;
$$;

-- Every card gets the new QR code on its next update.
update public.customers set pass_updated_at = now();
