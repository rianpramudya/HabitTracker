-- Explicit owner opt-in for local development personal data. Never auto-run on signup.
create table private.dev_consents (
 owner_id uuid primary key references auth.users(id),
 version text not null check (version = 'dev-personal-v1'),
 accepted_at timestamptz not null default now(),
 health_tracking boolean not null,
 finance_tracking boolean not null,
 check (health_tracking and finance_tracking)
);
alter table private.dev_consents enable row level security;
revoke all on private.dev_consents from public, anon, authenticated;
grant select, insert, update on private.dev_consents to service_role;

create function private.activate_dev_account(
 p_owner uuid, p_session uuid, p_email text, p_name text, p_language text,
 p_health boolean, p_finance boolean
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_name is null or length(trim(p_name)) not between 1 and 60
    or p_language is null or p_language not in ('id','en')
    or p_health is not true or p_finance is not true then
   raise exception 'invalid development consent' using errcode = '22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
 if not exists (
   select 1 from auth.sessions s join auth.users u on u.id = s.user_id
   where s.id = p_session and u.id = p_owner and lower(u.email) = lower(p_email)
     and u.email_confirmed_at is not null
     and (s.not_after is null or s.not_after > now())
 ) then
   raise exception 'invalid development session' using errcode = '42501';
 end if;
 insert into private.dev_consents(owner_id,version,health_tracking,finance_tracking)
 values(p_owner,'dev-personal-v1',true,true)
 on conflict(owner_id) do update set version=excluded.version,accepted_at=now(),
   health_tracking=excluded.health_tracking,finance_tracking=excluded.finance_tracking;
 insert into public.profiles(owner_id,name) values(p_owner,trim(p_name))
 on conflict(owner_id) do nothing;
 insert into public.preferences(owner_id,language,theme,timezone,enabled)
 values(p_owner,p_language,'system','Asia/Jakarta',array['custom','exercise','water','study','fasting','finance','reflection'])
 on conflict(owner_id) do nothing;
 insert into private.account_access(owner_id,setup_complete,status)
 values(p_owner,true,'active') on conflict(owner_id) do nothing;
 if not exists(select 1 from private.entitlements where owner_id=p_owner and status='active') then
   insert into private.entitlements(owner_id,status,source,starts_at,expires_at,actor_id,reason)
   values(p_owner,'active','beta_grant',now(),now()+interval '7 days',p_owner,
     'Owner-approved local development access; no payment; 2026-10-06');
 end if;
 insert into private.session_guards(id,owner_id,issued_at,expires_at,idle_expires_at)
 values(p_session,p_owner,now(),now()+interval '7 days',now()+interval '24 hours')
 on conflict(id) do nothing;
 insert into private.audit(actor_id,action,subject_id,reason)
 values(p_owner,'dev_access_activated',p_owner,'Explicit personal-data opt-in; dev-personal-v1');
 return true;
end;
$$;
revoke all on function private.activate_dev_account(uuid,uuid,text,text,text,boolean,boolean)
 from public,anon,authenticated;
grant execute on function private.activate_dev_account(uuid,uuid,text,text,text,boolean,boolean)
 to service_role;

create function public.activate_dev_account(
 p_owner uuid, p_session uuid, p_email text, p_name text, p_language text,
 p_health boolean, p_finance boolean
) returns boolean language sql security invoker set search_path = '' as $$
 select private.activate_dev_account(p_owner,p_session,p_email,p_name,p_language,p_health,p_finance);
$$;
revoke all on function public.activate_dev_account(uuid,uuid,text,text,text,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.activate_dev_account(uuid,uuid,text,text,text,boolean,boolean)
 to service_role;

create function private.resume_dev_session(p_owner uuid,p_session uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if not exists (
   select 1 from auth.sessions s join private.account_access a on a.owner_id=s.user_id
   join private.dev_consents c on c.owner_id=a.owner_id
   join private.entitlements e on e.owner_id=a.owner_id
   where s.id=p_session and s.user_id=p_owner and a.status='active' and a.setup_complete
     and c.version='dev-personal-v1' and c.health_tracking and c.finance_tracking
     and e.status='active' and e.starts_at<=now() and e.expires_at>now()
     and (s.not_after is null or s.not_after>now())
 ) then return false; end if;
 insert into private.session_guards(id,owner_id,issued_at,expires_at,idle_expires_at)
 values(p_session,p_owner,now(),now()+interval '7 days',now()+interval '24 hours')
 on conflict(id) do nothing;
 return true;
end;
$$;
revoke all on function private.resume_dev_session(uuid,uuid) from public,anon,authenticated;
grant execute on function private.resume_dev_session(uuid,uuid) to service_role;

create function public.resume_dev_session(p_owner uuid,p_session uuid) returns boolean
language sql security invoker set search_path = '' as $$
 select private.resume_dev_session(p_owner,p_session);
$$;
revoke all on function public.resume_dev_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.resume_dev_session(uuid,uuid) to service_role;
