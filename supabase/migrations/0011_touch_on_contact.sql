-- Contact details and logo text now appear on passes, so changing them refreshes every card too.
create or replace function private.touch_venue_passes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.name, new.reward_type, new.stamps_needed, new.points_needed, new.reward_text, new.card_bg,
      new.card_fg, new.card_accent, new.logo_url, new.pass_message, new.logo_text, new.address,
      new.phone, new.website)
     is distinct from
     (old.name, old.reward_type, old.stamps_needed, old.points_needed, old.reward_text, old.card_bg,
      old.card_fg, old.card_accent, old.logo_url, old.pass_message, old.logo_text, old.address,
      old.phone, old.website) then
    update public.customers set pass_updated_at = now() where venue_id = new.id;
  end if;
  return new;
end;
$$;
