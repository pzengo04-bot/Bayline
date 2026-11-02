-- Removing someone from a venue signs them out everywhere: their refresh tokens go, so no device can
-- renew its login. (Their current access token also stops working for the venue at once, since
-- membership is checked on every request.) Server only.
create function public.end_user_sessions(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.sessions where user_id = p_user;
end;
$$;
revoke execute on function public.end_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.end_user_sessions(uuid) to service_role;
