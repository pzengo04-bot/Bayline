-- Public bucket for venue logos (shown on the join page and wallet passes).
-- Uploads go through the server with the secret key after an owner check, so no storage policies
-- are needed for writes. Skipped where the storage schema doesn't exist (offline tests).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('venue-logos', 'venue-logos', true, 2097152, array['image/png'])
    on conflict (id) do nothing;
  end if;
end $$;
