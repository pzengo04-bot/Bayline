-- Explicit table privileges for the API roles. Newer Supabase projects don't grant these
-- automatically. Row Level Security still decides which rows each signed-in user can reach;
-- these grants only open the door to the tables at all. Anonymous visitors get no table access.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, delete on public.venues to authenticated; -- update is limited to reward columns in 0001
grant select on public.platform_admins to authenticated;
grant select, insert, delete on public.venue_members to authenticated;
grant select, insert, delete on public.customers to authenticated; -- update is limited to name/consent in 0001
grant select, insert, delete on public.visits to authenticated;
grant select, insert, delete on public.rewards_redeemed to authenticated;
grant select on public.customer_stats to authenticated;

-- The secret key (server-side admin tasks, seed script) bypasses RLS and needs full access.
grant all on public.venues, public.platform_admins, public.venue_members, public.customers, public.visits,
  public.rewards_redeemed, public.customer_stats to service_role;
grant usage on schema private to service_role;
grant execute on all functions in schema public to service_role;
