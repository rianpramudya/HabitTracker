-- The Feed calls this private boolean lookup through a service-only RPC. It must
-- inspect auth.users without granting the service role broad table SELECT.
-- The caller cannot read a user row or invoke this function from anon/authenticated.
alter function private.social_author_active(uuid) security definer;
revoke all on function private.social_author_active(uuid) from public, anon, authenticated;
grant execute on function private.social_author_active(uuid) to service_role;
