-- Keep provider-managed automatic RLS trigger, remove unnecessary API-role EXECUTE.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;
create index audit_actor on private.audit(actor_id);
create index entitlements_actor on private.entitlements(actor_id);
