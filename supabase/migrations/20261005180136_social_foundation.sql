-- Social foundation remains server-flagged OFF. Data API callers receive no table privileges.
create table private.social_cohorts (
 owner_id uuid primary key references auth.users(id), consent_version text not null check(consent_version='social-dev-v1'),
 accepted_at timestamptz not null default now(), active boolean not null default true
);
create table public.social_posts (
 id uuid primary key, author_id uuid not null references public.profiles(owner_id),
 body text not null check(length(trim(body)) between 1 and 2000),
 visibility text not null default 'private' check(visibility in ('private','community')),
 snapshot jsonb, version integer not null default 1 check(version>0),
 status text not null default 'active' check(status in ('active','hidden','deleted')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index social_posts_order on public.social_posts(created_at desc,id desc) where status='active';
create index social_posts_author on public.social_posts(author_id,created_at desc,id desc);
create table private.social_blocks (
 blocker_id uuid not null references public.profiles(owner_id), blocked_id uuid not null references public.profiles(owner_id),
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create index social_blocks_reverse on private.social_blocks(blocked_id,blocker_id);
create table private.social_reports (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.social_posts(id),
 reporter_id uuid not null references public.profiles(owner_id), reason text not null check(length(trim(reason)) between 1 and 500),
 status text not null default 'pending' check(status in ('pending','reviewed','actioned','dismissed')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, decision text,
 created_at timestamptz not null default now(), unique(post_id,reporter_id)
);
create index social_reports_queue on private.social_reports(status,created_at,id);
alter table private.social_cohorts enable row level security;
alter table public.social_posts enable row level security;
alter table private.social_blocks enable row level security;
alter table private.social_reports enable row level security;
revoke all on private.social_cohorts,public.social_posts,private.social_blocks,private.social_reports from public,anon,authenticated;
grant select,insert,update,delete on private.social_cohorts,public.social_posts,private.social_blocks,private.social_reports to service_role;

create function private.social_access(p_owner uuid,p_session uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select private.product_access(p_owner,p_session) and exists(
  select 1 from private.social_cohorts c where c.owner_id=p_owner and c.active and c.consent_version='social-dev-v1');
$$;
revoke all on function private.social_access(uuid,uuid) from public,anon,authenticated;
grant execute on function private.social_access(uuid,uuid) to service_role;

create function private.social_author_active(p_owner uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from private.account_access a join auth.users u on u.id=a.owner_id
   join private.entitlements e on e.owner_id=a.owner_id
   join private.social_cohorts c on c.owner_id=a.owner_id
   where a.owner_id=p_owner and a.status='active' and a.setup_complete and c.active and u.email_confirmed_at is not null
    and e.status='active' and e.starts_at<=now() and (e.expires_at is null or e.expires_at>now()));
$$;
revoke all on function private.social_author_active(uuid) from public,anon,authenticated;
grant execute on function private.social_author_active(uuid) to service_role;

create function private.social_blocked(p_a uuid,p_b uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from private.social_blocks b where
  (b.blocker_id=p_a and b.blocked_id=p_b) or (b.blocker_id=p_b and b.blocked_id=p_a));
$$;
revoke all on function private.social_blocked(uuid,uuid) from public,anon,authenticated;
grant execute on function private.social_blocked(uuid,uuid) to service_role;

create function public.social_join(p_owner uuid,p_session uuid) returns boolean
language plpgsql security invoker set search_path='' as $$ begin
 if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 insert into private.social_cohorts(owner_id,consent_version) values(p_owner,'social-dev-v1')
 on conflict(owner_id) do update set active=true,consent_version='social-dev-v1',accepted_at=now();
 return true;
end;$$;

create function public.social_create(p_owner uuid,p_session uuid,p_id uuid,p_body text,p_visibility text,p_entry_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_snapshot jsonb;v_entry public.entries;v_post public.social_posts;
begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if p_visibility not in ('private','community') or length(trim(p_body)) not between 1 and 2000 then
  raise exception 'invalid post' using errcode='22023';end if;
 if p_entry_id is not null then
  select * into v_entry from public.entries where owner_id=p_owner and id=p_entry_id and not deleted;
  if not found then raise exception 'invalid source' using errcode='42501';end if;
  if v_entry.module='finance' then v_snapshot:=jsonb_build_object('kind','finance','label','Sudah mencatat keuangan');
  else v_snapshot:=jsonb_build_object('kind',v_entry.module,'label',v_entry.name,'amount',v_entry.amount);end if;
 end if;
 insert into public.social_posts(id,author_id,body,visibility,snapshot)
 values(p_id,p_owner,trim(p_body),p_visibility,v_snapshot)
 on conflict(id) do nothing returning * into v_post;
 if not found then
  select * into v_post from public.social_posts where id=p_id and author_id=p_owner;
  if not found or v_post.body<>trim(p_body) or v_post.visibility<>p_visibility or v_post.snapshot is distinct from v_snapshot then
   raise exception 'post id conflict' using errcode='23505';end if;
 end if;
 return jsonb_build_object('id',v_post.id,'version',v_post.version);
end;$$;

create function public.social_feed(p_owner uuid,p_session uuid,p_at timestamptz,p_id uuid,p_limit integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_result jsonb;begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if p_limit not between 1 and 30 or (p_at is null)<>(p_id is null) then raise exception 'invalid cursor' using errcode='22023';end if;
 with visible as (
  select p.*,pr.name as author_name from public.social_posts p join public.profiles pr on pr.owner_id=p.author_id
  where p.status='active' and (p_at is null or (p.created_at,p.id)<(p_at,p_id))
   and (p.author_id=p_owner or (p.visibility='community' and private.social_author_active(p.author_id)
    and not private.social_blocked(p_owner,p.author_id)))
  order by p.created_at desc,p.id desc limit p_limit+1
 ), numbered as (select *,row_number() over(order by created_at desc,id desc) as rn from visible)
 select jsonb_build_object('posts',coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'authorId',author_id,'authorName',author_name,'body',body,'visibility',visibility,
  'snapshot',snapshot,'version',version,'createdAt',created_at,'mine',author_id=p_owner
 ) order by created_at desc,id desc) filter(where rn<=p_limit),'[]'::jsonb),
 'hasMore',coalesce(bool_or(rn>p_limit),false)) into v_result from numbered;
 return v_result;
end;$$;

create function public.social_edit(p_owner uuid,p_session uuid,p_id uuid,p_version integer,p_body text,p_visibility text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_version integer;begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if p_visibility not in ('private','community') or length(trim(p_body)) not between 1 and 2000 then raise exception 'invalid post' using errcode='22023';end if;
 update public.social_posts set body=trim(p_body),visibility=p_visibility,version=version+1,updated_at=now()
 where id=p_id and author_id=p_owner and version=p_version and status='active' returning version into v_version;
 if v_version is null then raise exception 'post conflict' using errcode='40001';end if;
 return v_version;
end;$$;

create function public.social_remove(p_owner uuid,p_session uuid,p_id uuid,p_version integer)
returns boolean language plpgsql security invoker set search_path='' as $$ begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 update public.social_posts set status='deleted',version=version+1,updated_at=now()
 where id=p_id and author_id=p_owner and version=p_version and status='active';
 if not found then raise exception 'post conflict' using errcode='40001';end if;
 return true;
end;$$;

create function public.social_block(p_owner uuid,p_session uuid,p_target uuid,p_block boolean)
returns boolean language plpgsql security invoker set search_path='' as $$ begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if p_target=p_owner or not exists(select 1 from public.profiles where owner_id=p_target) then
  raise exception 'invalid target' using errcode='22023';end if;
 if p_block then insert into private.social_blocks(blocker_id,blocked_id) values(p_owner,p_target) on conflict do nothing;
 else delete from private.social_blocks where blocker_id=p_owner and blocked_id=p_target;end if;
 return true;
end;$$;

create function public.social_report(p_owner uuid,p_session uuid,p_post uuid,p_reason text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_author uuid;begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if length(trim(p_reason)) not between 1 and 500 then raise exception 'invalid report' using errcode='22023';end if;
 select author_id into v_author from public.social_posts where id=p_post and status='active' and visibility='community';
 if v_author is null or v_author=p_owner or not private.social_author_active(v_author) or private.social_blocked(p_owner,v_author) then
  raise exception 'post unavailable' using errcode='42501';end if;
 insert into private.social_reports(post_id,reporter_id,reason) values(p_post,p_owner,trim(p_reason)) on conflict(post_id,reporter_id) do nothing;
 return true;
end;$$;

create function private.social_moderator_access(p_owner uuid,p_session uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select private.product_access(p_owner,p_session) and exists(
  select 1 from private.roles where owner_id=p_owner and role='moderator');
$$;
revoke all on function private.social_moderator_access(uuid,uuid) from public,anon,authenticated;
grant execute on function private.social_moderator_access(uuid,uuid) to service_role;

create function public.social_moderation_queue(p_owner uuid,p_session uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_result jsonb;begin
 if not private.social_moderator_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'postId',p.id,'body',p.body,
  'authorName',pr.name,'reason',r.reason,'createdAt',r.created_at) order by r.created_at,r.id),'[]'::jsonb)
 into v_result from (select * from private.social_reports where status='pending' order by created_at,id limit 50) r
 join public.social_posts p on p.id=r.post_id join public.profiles pr on pr.owner_id=p.author_id;
 return v_result;
end;$$;

create function public.social_moderate(p_owner uuid,p_session uuid,p_report uuid,p_hide boolean,p_reason text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_post uuid;begin
 if not private.social_moderator_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if length(trim(p_reason)) not between 1 and 500 then raise exception 'reason required' using errcode='22023';end if;
 update private.social_reports set status=case when p_hide then 'actioned' else 'dismissed' end,
  reviewed_by=p_owner,reviewed_at=now(),decision=trim(p_reason)
 where id=p_report and status='pending' returning post_id into v_post;
 if v_post is null then raise exception 'report conflict' using errcode='40001';end if;
 if p_hide then update public.social_posts set status='hidden',updated_at=now(),version=version+1
  where id=v_post and status='active';end if;
 insert into private.audit(actor_id,action,subject_id,reason)
 values(p_owner,case when p_hide then 'social_post_hidden' else 'social_report_dismissed' end,v_post,trim(p_reason));
 return true;
end;$$;

-- All writes and reads are service-only; app layer additionally gates feature and moderator MFA.
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('social_join','social_create','social_feed','social_edit','social_remove','social_block','social_report','social_moderation_queue','social_moderate') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
