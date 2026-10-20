-- Bayline pilot schema: venues, their members, customers, visits and rewards.
-- Every table has Row Level Security on. Owners and staff only see their own venue;
-- platform admins see everything. Anonymous visitors can't touch tables at all and
-- only reach the database through the check-in functions at the bottom.

create schema if not exists private;

-- ---------- types ----------

create type public.venue_type as enum ('golf_sim', 'pickleball', 'batting_cages', 'other');
create type public.reward_type as enum ('stamps', 'points');
create type public.member_role as enum ('owner', 'staff');
create type public.visit_source as enum ('qr', 'staff');

-- ---------- tables ----------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 50),
  type public.venue_type not null default 'golf_sim',
  reward_type public.reward_type not null default 'stamps',
  stamps_needed int not null default 5 check (stamps_needed between 2 and 50),
  points_per_dollar numeric(6, 2) not null default 1 check (points_per_dollar > 0 and points_per_dollar <= 100),
  points_needed int not null default 500 check (points_needed between 10 and 100000),
  reward_text text not null default 'free bay hour' check (char_length(btrim(reward_text)) between 1 and 60),
  -- Used to show visit times and the busy/empty heatmap in the venue's local time.
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.venue_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index venue_members_venue on public.venue_members (venue_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  phone text not null check (phone ~ '^\+1[2-9][0-9]{9}$'), -- US/Canada, normalized like +19145550123
  text_consent boolean not null default false,
  consent_timestamp timestamptz,
  consent_text text,
  created_at timestamptz not null default now(),
  unique (venue_id, phone),
  unique (id, venue_id), -- lets visits/rewards reference (customer, venue) together
  check (not text_consent or (consent_timestamp is not null and consent_text is not null))
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  customer_id uuid not null,
  visited_at timestamptz not null default now(),
  amount numeric(10, 2) check (amount is null or (amount >= 0 and amount < 100000)),
  -- Points earned on this visit, fixed at the rate in effect when it was recorded.
  points int not null default 0,
  source public.visit_source not null default 'qr',
  foreign key (customer_id, venue_id) references public.customers (id, venue_id) on delete cascade
);
create index visits_venue_time on public.visits (venue_id, visited_at desc);
create index visits_customer_time on public.visits (customer_id, visited_at desc);

create table public.rewards_redeemed (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  customer_id uuid not null,
  redeemed_at timestamptz not null default now(),
  reward_text text not null,
  points_spent int not null default 0, -- points venues only
  foreign key (customer_id, venue_id) references public.customers (id, venue_id) on delete cascade
);
create index rewards_venue_time on public.rewards_redeemed (venue_id, redeemed_at desc);
create index rewards_customer_time on public.rewards_redeemed (customer_id, redeemed_at desc);

-- ---------- access helpers (security definer so policies don't recurse) ----------

create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create function private.is_venue_member(p_venue uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin() or exists (
    select 1 from public.venue_members where venue_id = p_venue and user_id = (select auth.uid())
  );
$$;

create function private.is_venue_owner(p_venue uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin() or exists (
    select 1 from public.venue_members
    where venue_id = p_venue and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin(), private.is_venue_member(uuid), private.is_venue_owner(uuid)
  to authenticated;

-- ---------- row level security ----------

alter table public.venues enable row level security;
alter table public.platform_admins enable row level security;
alter table public.venue_members enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.rewards_redeemed enable row level security;

-- Anonymous visitors get nothing directly.
revoke all on public.venues, public.platform_admins, public.venue_members, public.customers,
  public.visits, public.rewards_redeemed from anon;

create policy "members read their venue" on public.venues for select to authenticated
  using (private.is_venue_member(id));
create policy "owners update their venue" on public.venues for update to authenticated
  using (private.is_venue_owner(id)) with check (private.is_venue_owner(id));
create policy "admins create venues" on public.venues for insert to authenticated
  with check (private.is_platform_admin());
create policy "admins delete venues" on public.venues for delete to authenticated
  using (private.is_platform_admin());
-- Owners may only change reward settings, never the name or the slug printed on their QR sign.
revoke update on public.venues from authenticated;
grant update (reward_type, stamps_needed, points_per_dollar, points_needed, reward_text) on public.venues
  to authenticated;

create policy "admins see themselves" on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "see own memberships and your venue's team" on public.venue_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_venue_owner(venue_id));
create policy "admins add members" on public.venue_members for insert to authenticated
  with check (private.is_platform_admin());
create policy "admins remove members" on public.venue_members for delete to authenticated
  using (private.is_platform_admin());

create policy "members read customers" on public.customers for select to authenticated
  using (private.is_venue_member(venue_id));
create policy "members add customers" on public.customers for insert to authenticated
  with check (private.is_venue_member(venue_id));
create policy "members update customers" on public.customers for update to authenticated
  using (private.is_venue_member(venue_id)) with check (private.is_venue_member(venue_id));
create policy "owners delete customers" on public.customers for delete to authenticated
  using (private.is_venue_owner(venue_id));
-- Staff can fix a name or record an opt-out, but consent can only be given by the customer.
revoke update on public.customers from authenticated;
grant update (name, text_consent) on public.customers to authenticated;

create policy "members read visits" on public.visits for select to authenticated
  using (private.is_venue_member(venue_id));
create policy "members add visits" on public.visits for insert to authenticated
  with check (private.is_venue_member(venue_id));
create policy "owners delete visits" on public.visits for delete to authenticated
  using (private.is_venue_owner(venue_id));

create policy "members read rewards" on public.rewards_redeemed for select to authenticated
  using (private.is_venue_member(venue_id));
create policy "members add rewards" on public.rewards_redeemed for insert to authenticated
  with check (private.is_venue_member(venue_id));
create policy "owners delete rewards" on public.rewards_redeemed for delete to authenticated
  using (private.is_venue_owner(venue_id));

-- ---------- consent guard ----------

create function private.guard_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.text_consent and not old.text_consent then
    raise exception 'Text consent can only be given by the customer at check-in';
  end if;
  return new;
end;
$$;

create trigger customers_guard_consent before update on public.customers
  for each row execute function private.guard_consent();

-- ---------- rewards logic ----------

-- The consent wording shown on the check-in page, stored verbatim with each opt-in.
create function private.consent_wording(p_venue_name text) returns text
language sql immutable set search_path = '' as $$
  select 'I agree to receive offers by text from ' || p_venue_name
    || '. Msg & data rates may apply. Reply STOP to opt out.';
$$;

-- Where a customer stands toward their next reward.
create function private.customer_progress(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select cu.id, cu.venue_id, v.reward_type, v.stamps_needed, v.points_needed, v.reward_text
    from public.customers cu join public.venues v on v.id = cu.venue_id
    where cu.id = p_customer
  ),
  last_reward as (
    select max(redeemed_at) as at from public.rewards_redeemed where customer_id = p_customer
  )
  select jsonb_build_object(
    'reward_type', c.reward_type,
    'reward_text', c.reward_text,
    'stamps', (select count(*) from public.visits vi
               where vi.customer_id = c.id
                 and vi.visited_at > coalesce((select at from last_reward), '-infinity'::timestamptz)),
    'stamps_needed', c.stamps_needed,
    'points', (select coalesce(sum(points), 0) from public.visits where customer_id = c.id)
            - (select coalesce(sum(points_spent), 0) from public.rewards_redeemed where customer_id = c.id),
    'points_needed', c.points_needed
  )
  from c;
$$;

-- Points are worked out from the amount when a visit is recorded.
create function private.set_visit_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
begin
  select * into v from public.venues where id = new.venue_id;
  if v.reward_type = 'points' and new.amount is not null then
    new.points := floor(new.amount * v.points_per_dollar);
  else
    new.points := 0;
  end if;
  return new;
end;
$$;

create trigger visits_set_points before insert on public.visits
  for each row execute function private.set_visit_points();

-- Stamp venues: the visit that completes the card unlocks the reward and starts a new card.
create function private.unlock_stamp_reward() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
  progress jsonb;
begin
  select * into v from public.venues where id = new.venue_id;
  if v.reward_type <> 'stamps' then
    return new;
  end if;
  progress := private.customer_progress(new.customer_id);
  if (progress ->> 'stamps')::int >= v.stamps_needed then
    insert into public.rewards_redeemed (venue_id, customer_id, redeemed_at, reward_text)
    values (new.venue_id, new.customer_id, new.visited_at, v.reward_text);
  end if;
  return new;
end;
$$;

create trigger visits_unlock_stamp_reward after insert on public.visits
  for each row execute function private.unlock_stamp_reward();

-- ---------- public check-in (no login) ----------

-- What the check-in page needs to know about a venue. Returns nothing for unknown slugs.
create function public.get_checkin_venue(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', name,
    'slug', slug,
    'reward_type', reward_type,
    'stamps_needed', stamps_needed,
    'points_per_dollar', points_per_dollar,
    'points_needed', points_needed,
    'reward_text', reward_text,
    'consent_text', private.consent_wording(name)
  )
  from public.venues where slug = p_slug;
$$;

-- Check a customer in by phone. Unknown phone without a name → 'new_customer' (ask for a name).
-- Repeat check-ins within 2 hours → 'too_soon'. Otherwise records the visit.
create function public.check_in(
  p_slug text,
  p_phone text,
  p_name text default null,
  p_consent boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.venues;
  cust public.customers;
  last_visit timestamptz;
  is_new boolean := false;
  rewards_before int;
  rewards_after int;
  visit_at timestamptz := now();
begin
  select * into v from public.venues where slug = p_slug;
  if not found then
    return jsonb_build_object('status', 'venue_not_found');
  end if;
  if p_phone is null or p_phone !~ '^\+1[2-9][0-9]{9}$' then
    return jsonb_build_object('status', 'invalid_phone');
  end if;

  -- One check-in at a time per phone, so a double tap can't record two visits.
  perform pg_advisory_xact_lock(hashtextextended(v.id::text || p_phone, 0));

  select * into cust from public.customers where venue_id = v.id and phone = p_phone;
  if not found then
    if p_name is null or char_length(btrim(p_name)) = 0 then
      return jsonb_build_object('status', 'new_customer');
    end if;
    insert into public.customers (venue_id, name, phone, text_consent, consent_timestamp, consent_text)
    values (
      v.id, left(btrim(p_name), 60), p_phone, coalesce(p_consent, false),
      case when p_consent then visit_at end,
      case when p_consent then private.consent_wording(v.name) end
    )
    returning * into cust;
    is_new := true;
  end if;

  select max(visited_at) into last_visit from public.visits where customer_id = cust.id;
  if last_visit is not null and last_visit > visit_at - interval '2 hours' then
    return jsonb_build_object(
      'status', 'too_soon',
      'first_name', split_part(cust.name, ' ', 1),
      'next_check_in_at', last_visit + interval '2 hours',
      'progress', private.customer_progress(cust.id)
    );
  end if;

  select count(*) into rewards_before from public.rewards_redeemed where customer_id = cust.id;
  insert into public.visits (venue_id, customer_id, visited_at, source) values (v.id, cust.id, visit_at, 'qr');
  select count(*) into rewards_after from public.rewards_redeemed where customer_id = cust.id;

  return jsonb_build_object(
    'status', 'checked_in',
    'first_name', split_part(cust.name, ' ', 1),
    'is_new', is_new,
    'reward_unlocked', rewards_after > rewards_before,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

revoke execute on function public.get_checkin_venue(text), public.check_in(text, text, text, boolean) from public;
grant execute on function public.get_checkin_venue(text), public.check_in(text, text, text, boolean)
  to anon, authenticated;

-- Keep internal helpers out of reach of the API roles except where granted above.
revoke execute on function private.customer_progress(uuid), private.consent_wording(text) from public;
