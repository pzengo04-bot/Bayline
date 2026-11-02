-- Where the venue is, from its address (US Census geocoder), so wallet cards can later show up on the
-- lock screen near the venue. Null until an address is found.
alter table public.venues
  add column latitude double precision check (latitude is null or latitude between -90 and 90),
  add column longitude double precision check (longitude is null or longitude between -180 and 180),
  add constraint venues_location_pair check ((latitude is null) = (longitude is null));
grant update (latitude, longitude) on public.venues to authenticated;
