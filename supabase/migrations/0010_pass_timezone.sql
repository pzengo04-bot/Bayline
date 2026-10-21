-- Pass data includes the venue time zone (for "offer valid until" dates on the card).
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
      select jsonb_build_object('text', s.message, 'sent_at', s.created_at, 'expires_at', s.expires_at)
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
