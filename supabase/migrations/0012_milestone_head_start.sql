-- Card v3: an optional milestone reward partway through the card, an optional head start for new
-- members, and a short offer line for the front of the card.

-- ---------- settings ----------

alter table public.venues
  -- One milestone at most: the stamp (or points total) that unlocks it. Ignored if it isn't below the goal.
  add column milestone_text text check (milestone_text is null or char_length(btrim(milestone_text)) between 1 and 40),
  add column milestone_at int check (milestone_at is null or milestone_at >= 1),
  -- Free stamps on joining (stamp cards only).
  add column head_start_stamps int not null default 0 check (head_start_stamps between 0 and 2),
  add constraint venues_milestone_pair check ((milestone_text is null) = (milestone_at is null));
grant update (milestone_text, milestone_at, head_start_stamps) on public.venues to authenticated;

-- Head-start stamps live on the customer, not as visits, so they never count in insights.
alter table public.customers
  add column bonus_stamps int not null default 0 check (bonus_stamps between 0 and 2);
grant select (bonus_stamps) on public.customers to authenticated;

-- Which reward was given: the milestone or the main reward (the main one starts a new card).
alter table public.rewards_redeemed
  add column kind text not null default 'main' check (kind in ('main', 'milestone'));

-- Short version of an offer for the front of the card ("Bonus stamp on any visit").
alter table public.offer_sends
  add column short_text text check (short_text is null or char_length(short_text) between 1 and 40);

-- ---------- progress ----------

-- A card cycle runs from the last main reward. Head-start stamps count in the first cycle only. The
-- milestone is ready once reached and stays ready until redeemed or the cycle ends.
create or replace function private.customer_progress(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select cu.id, cu.bonus_stamps, v.reward_type, v.stamps_needed, v.points_needed, v.reward_text,
      v.milestone_text, v.milestone_at
    from public.customers cu join public.venues v on v.id = cu.venue_id
    where cu.id = p_customer
  ),
  r as (
    select max(rr.redeemed_at) filter (where rr.kind = 'main') as last_main,
      coalesce(sum(rr.points_spent), 0) as spent
    from c left join public.rewards_redeemed rr on rr.customer_id = c.id
  ),
  p as (
    select
      ((select count(*) from public.visits vi where vi.customer_id = c.id
          and vi.visited_at > coalesce(r.last_main, '-infinity'::timestamptz))
        + case when r.last_main is null then c.bonus_stamps else 0 end)::int as stamps,
      ((select coalesce(sum(points), 0) from public.visits where customer_id = c.id) - r.spent)::int as points,
      exists (select 1 from public.rewards_redeemed m where m.customer_id = c.id and m.kind = 'milestone'
        and m.redeemed_at > coalesce(r.last_main, '-infinity'::timestamptz)) as milestone_redeemed
    from c, r
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

-- Staff redeem the milestone or the main reward. Each once per card cycle.
drop function public.redeem_reward(uuid);
create function public.redeem_reward(p_customer uuid, p_kind text default 'main') returns jsonb
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
  end if;
  return private.customer_progress(cust.id);
end;
$$;
revoke execute on function public.redeem_reward(uuid, text) from public, anon;
grant execute on function public.redeem_reward(uuid, text) to authenticated, service_role;

-- Dashboard stamp counts follow the same cycle rules (main rewards only, head start in the first cycle).
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
  ((count(v.id) filter (where v.visited_at > coalesce(r.last_reward_at, '-infinity'::timestamptz)))
    + case when r.last_reward_at is null then c.bonus_stamps else 0 end)::int as stamps,
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

-- ---------- joining ----------

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
    'card_accent', card_accent,
    'head_start_stamps', case when reward_type = 'stamps' then head_start_stamps else 0 end
  )
  from public.venues where slug = p_slug;
$$;

-- Same as before, plus the venue's head start for brand-new members (returned as head_start).
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
      bonus := case when v.reward_type = 'stamps' then v.head_start_stamps else 0 end;
      insert into public.customers (venue_id, name, phone, bonus_stamps) values (v.id, left(btrim(p_name), 60), p_phone, bonus)
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
    'head_start', bonus,
    'progress', private.customer_progress(cust.id)
  );
end;
$$;

-- ---------- passes ----------

create or replace function public.wallet_pass_data(p_serial uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customer_id', c.id,
    'serial', c.pass_serial,
    'first_name', split_part(c.name, ' ', 1),
    'apple_auth_token', c.apple_auth_token,
    'updated_at', c.pass_updated_at,
    'venue', jsonb_build_object(
      'id', v.id, 'name', v.name, 'slug', v.slug, 'logo_url', v.logo_url, 'logo_text', v.logo_text,
      'card_bg', v.card_bg, 'card_fg', v.card_fg, 'card_accent', v.card_accent,
      'pass_message', v.pass_message, 'reward_type', v.reward_type, 'reward_text', v.reward_text,
      'address', v.address, 'phone', v.phone, 'website', v.website, 'timezone', v.timezone
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
revoke execute on function public.wallet_pass_data(uuid) from public, anon, authenticated;
grant execute on function public.wallet_pass_data(uuid) to service_role;

-- Milestone changes show on every card.
create or replace function private.touch_venue_passes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.name, new.reward_type, new.stamps_needed, new.points_needed, new.reward_text, new.card_bg,
      new.card_fg, new.card_accent, new.logo_url, new.pass_message, new.logo_text, new.address,
      new.phone, new.website, new.milestone_text, new.milestone_at)
     is distinct from
     (old.name, old.reward_type, old.stamps_needed, old.points_needed, old.reward_text, old.card_bg,
      old.card_fg, old.card_accent, old.logo_url, old.pass_message, old.logo_text, old.address,
      old.phone, old.website, old.milestone_text, old.milestone_at) then
    update public.customers set pass_updated_at = now() where venue_id = new.id;
  end if;
  return new;
end;
$$;
