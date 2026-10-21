-- Phase 1: wallet cards and tap-to-join.
-- Customers join with first name + phone, get a wallet pass, and every later tap adds a stamp
-- (limited per calendar day). Rewards are no longer redeemed automatically: when a card is full
-- it shows "Reward ready" until staff redeem it from the dashboard.

-- ---------- venues: card design, owner phone, daily limit ----------

alter table public.venues
  add column phone text check (phone is null or phone ~ '^\+1[2-9][0-9]{9}$'),
  add column logo_url text,
  add column card_bg text not null default '#0f1512' check (card_bg ~ '^#[0-9a-fA-F]{6}$'),
  add column card_fg text not null default '#ffffff' check (card_fg ~ '^#[0-9a-fA-F]{6}$'),
  add column card_accent text not null default '#c4f04a' check (card_accent ~ '^#[0-9a-fA-F]{6}$'),
  -- Points earned per tap/visit when no amount is entered (points venues).
  add column points_per_visit int not null default 10 check (points_per_visit between 1 and 10000),
  -- Stamps a phone can earn per calendar day; null means unlimited (demo venue).
  add column stamps_per_day int default 1 check (stamps_per_day is null or stamps_per_day between 1 and 10),
  -- Shown on the back of every pass; Phase 2 uses it for offers.
  add column pass_message text check (pass_message is null or char_length(pass_message) <= 200);

grant update (card_bg, card_fg, card_accent, logo_url, points_per_visit, pass_message, phone) on public.venues
  to authenticated;

-- ---------- customers: wallet identity ----------

alter table public.customers
  add column pass_serial uuid not null default gen_random_uuid() unique,
  add column apple_auth_token text not null default replace(gen_random_uuid()::text, '-', ''),
  add column return_token uuid not null default gen_random_uuid() unique,
  add column wallet_platforms text[] not null default '{}',
  add column pass_updated_at timestamptz not null default now();

-- Owners and staff can see customers, but not the secrets that identify a customer's phone or pass.
revoke select on public.customers from authenticated;
grant select (id, venue_id, name, phone, text_consent, consent_timestamp, consent_text, created_at,
  pass_serial, wallet_platforms, pass_updated_at) on public.customers to authenticated;

-- ---------- Apple Wallet device registrations (server only) ----------

create table public.apple_registrations (
  device_library_id text not null,
  pass_type_id text not null,
  serial_number uuid not null references public.customers (pass_serial) on delete cascade,
  push_token text not null,
  created_at timestamptz not null default now(),
  primary key (device_library_id, pass_type_id, serial_number)
);
create index apple_registrations_serial on public.apple_registrations (serial_number);
alter table public.apple_registrations enable row level security;
-- No policies and no grants: only the server (secret key) reads or writes registrations.
revoke all on public.apple_registrations from anon, authenticated;
grant all on public.apple_registrations to service_role;

-- ---------- tap log ----------

create table public.taps (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  source text not null default 'web' check (source in ('nfc', 'qr', 'web')),
  result text not null check (result in ('joined', 'stamped', 'limit_reached', 'need_details')),
  created_at timestamptz not null default now()
);
create index taps_venue_time on public.taps (venue_id, created_at desc);
alter table public.taps enable row level security;
create policy "members read taps" on public.taps for select to authenticated
  using (private.is_venue_member(venue_id));
revoke all on public.taps from anon;
grant select on public.taps to authenticated;
grant all on public.taps to service_role;

-- ---------- pass freshness ----------

-- Any change a pass shows bumps pass_updated_at, which Apple's "what changed?" call relies on.
create function private.touch_pass() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.customers set pass_updated_at = now()
  where id = coalesce(new.customer_id, old.customer_id);
  return coalesce(new, old);
end;
$$;
create trigger visits_touch_pass after insert or delete on public.visits
  for each row execute function private.touch_pass();
create trigger rewards_touch_pass after insert or delete on public.rewards_redeemed
  for each row execute function private.touch_pass();

create function private.touch_venue_passes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.name, new.reward_type, new.stamps_needed, new.points_needed, new.reward_text, new.card_bg,
      new.card_fg, new.card_accent, new.logo_url, new.pass_message)
     is distinct from
     (old.name, old.reward_type, old.stamps_needed, old.points_needed, old.reward_text, old.card_bg,
      old.card_fg, old.card_accent, old.logo_url, old.pass_message) then
    update public.customers set pass_updated_at = now() where venue_id = new.id;
  end if;
  return new;
end;
$$;
create trigger venues_touch_passes after update on public.venues
  for each row execute function private.touch_venue_passes();

-- ---------- rewards: "ready" instead of auto-redeem ----------

drop trigger visits_unlock_stamp_reward on public.visits;
drop function private.unlock_stamp_reward();

-- Taps without an amount earn the venue's points per visit; staff-entered amounts earn per dollar.
create or replace function private.set_visit_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
begin
  select * into v from public.venues where id = new.venue_id;
  if v.reward_type <> 'points' then
    new.points := 0;
  elsif new.amount is not null then
    new.points := floor(new.amount * v.points_per_dollar);
  else
    new.points := v.points_per_visit;
  end if;
  return new;
end;
$$;

create or replace function private.customer_progress(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select cu.id, v.reward_type, v.stamps_needed, v.points_needed, v.reward_text
    from public.customers cu join public.venues v on v.id = cu.venue_id
    where cu.id = p_customer
  ),
  p as (
    select
      (select count(*) from public.visits vi where vi.customer_id = c.id
        and vi.visited_at > coalesce((select max(redeemed_at) from public.rewards_redeemed where customer_id = c.id),
                                     '-infinity'::timestamptz))::int as stamps,
      ((select coalesce(sum(points), 0) from public.visits where customer_id = c.id)
        - (select coalesce(sum(points_spent), 0) from public.rewards_redeemed where customer_id = c.id))::int as points
    from c
  )
  select jsonb_build_object(
    'reward_type', c.reward_type,
    'reward_text', c.reward_text,
    'stamps', least(p.stamps, c.stamps_needed),
    'stamps_needed', c.stamps_needed,
    'points', p.points,
    'points_needed', c.points_needed,
    'reward_ready', case when c.reward_type = 'stamps' then p.stamps >= c.stamps_needed else p.points >= c.points_needed end
  )
  from c, p;
$$;

-- Staff redeem a ready reward (stamps or points); the card starts over.
create function public.redeem_reward(p_customer uuid) returns jsonb
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
  if not (progress ->> 'reward_ready')::boolean then
    raise exception 'Reward not ready yet' using errcode = '22023';
  end if;
  insert into public.rewards_redeemed (venue_id, customer_id, reward_text, points_spent)
  values (v.id, cust.id, v.reward_text, case when v.reward_type = 'points' then v.points_needed else 0 end);
  return private.customer_progress(cust.id);
end;
$$;

drop function public.redeem_points_reward(uuid);
revoke execute on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated, service_role;

-- The view's stamp count also caps at a full card.
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

-- ---------- public tap / join ----------

drop function public.check_in(text, text, text, boolean);

-- What the join page needs about a venue (no secrets).
create or replace function public.get_checkin_venue(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'reward_type', reward_type,
    'stamps_needed', stamps_needed,
    'points_per_dollar', points_per_dollar,
    'points_per_visit', points_per_visit,
    'points_needed', points_needed,
    'reward_text', reward_text,
    'logo_url', logo_url,
    'card_bg', card_bg,
    'card_fg', card_fg,
    'card_accent', card_accent
  )
  from public.venues where slug = p_slug;
$$;

-- One tap. Identify the customer by their return cookie, or by phone (+ first name to join).
-- Results: joined | stamped | limit_reached | need_details | venue_not_found | invalid_phone.
create function public.tap(
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
  today_count int;
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
      insert into public.customers (venue_id, name, phone) values (v.id, left(btrim(p_name), 60), p_phone)
      returning * into cust;
      joined := true;
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(v.id::text || cust.phone, 0));
  end if;

  select count(*) into today_count from public.visits
  where customer_id = cust.id
    and (visited_at at time zone v.timezone)::date = (now() at time zone v.timezone)::date;

  if v.stamps_per_day is not null and today_count >= v.stamps_per_day then
    result := 'limit_reached';
  else
    insert into public.visits (venue_id, customer_id, source) values (v.id, cust.id, 'qr');
    result := case when joined then 'joined' else 'stamped' end;
  end if;
  insert into public.taps (venue_id, customer_id, source, result) values (v.id, cust.id, src, result);

  return jsonb_build_object(
    'status', result,
    'first_name', split_part(cust.name, ' ', 1),
    'customer_id', cust.id,
    'return_token', cust.return_token,
    'pass_serial', cust.pass_serial,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

revoke execute on function public.tap(text, text, uuid, text, text) from public;
grant execute on function public.tap(text, text, uuid, text, text) to anon, authenticated, service_role;

-- Keep add_visit's reward handling in step with "ready" rewards (no auto-unlock any more).
create or replace function public.add_visit(p_venue uuid, p_phone text, p_amount numeric default null, p_name text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers;
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

  insert into public.visits (venue_id, customer_id, amount, source) values (p_venue, cust.id, p_amount, 'staff');
  return jsonb_build_object(
    'customer_id', cust.id,
    'name', cust.name,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- Server-side wallet lookups (secret key only).
create function public.wallet_pass_data(p_serial uuid) returns jsonb
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
    'progress', private.customer_progress(c.id)
  )
  from public.customers c join public.venues v on v.id = c.venue_id
  where c.pass_serial = p_serial;
$$;
revoke execute on function public.wallet_pass_data(uuid) from public, anon, authenticated;
grant execute on function public.wallet_pass_data(uuid) to service_role;
