-- Card polish: more kinds of business, and a stamp icon per venue (coffee cups, golf balls…).

alter type public.venue_type add value if not exists 'cafe';
alter type public.venue_type add value if not exists 'barbershop';
alter type public.venue_type add value if not exists 'fitness';
alter type public.venue_type add value if not exists 'pet';
alter type public.venue_type add value if not exists 'car_wash';
alter type public.venue_type add value if not exists 'dessert';

-- Null means "the default for this type of business" (lib/wallet/stamp-icons.ts).
alter table public.venues
  add column stamp_icon text check (stamp_icon is null or stamp_icon in
    ('check', 'coffee', 'golf', 'paddle', 'baseball', 'scissors', 'dumbbell', 'paw', 'drop', 'ice_cream', 'star'));
grant update (stamp_icon) on public.venues to authenticated;

-- Pass data includes the venue type and stamp icon.
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
revoke execute on function public.wallet_pass_data(uuid) from public, anon, authenticated;
grant execute on function public.wallet_pass_data(uuid) to service_role;

-- A new stamp icon redraws every card.
create or replace function private.touch_venue_passes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.name, new.reward_type, new.stamps_needed, new.points_needed, new.reward_text, new.card_bg,
      new.card_fg, new.card_accent, new.logo_url, new.pass_message, new.logo_text, new.address,
      new.phone, new.website, new.milestone_text, new.milestone_at, new.stamp_icon)
     is distinct from
     (old.name, old.reward_type, old.stamps_needed, old.points_needed, old.reward_text, old.card_bg,
      old.card_fg, old.card_accent, old.logo_url, old.pass_message, old.logo_text, old.address,
      old.phone, old.website, old.milestone_text, old.milestone_at, old.stamp_icon) then
    update public.customers set pass_updated_at = now() where venue_id = new.id;
  end if;
  return new;
end;
$$;
