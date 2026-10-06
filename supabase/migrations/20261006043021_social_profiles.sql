-- Small, bounded profile avatars for the development social cohort. Keep binary
-- data private and serve it only through session/entitlement/block-checked RPCs.
create table private.social_avatars (
  owner_id uuid primary key references public.profiles(owner_id),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  bytes bytea not null check (octet_length(bytes) between 1 and 524288),
  version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table private.social_avatars enable row level security;
revoke all on private.social_avatars from public, anon, authenticated;
grant select, insert, update, delete on private.social_avatars to service_role;

create function public.social_people(p_owner uuid, p_session uuid, p_query text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_query text; v_result jsonb;
begin
  if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  v_query:=trim(p_query);
  if length(v_query) not between 2 and 60 then raise exception 'invalid query' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'avatarVersion',avatar_version)
    order by lower(name),id),'[]'::jsonb) into v_result
  from (
    select p.owner_id id,p.name,a.version avatar_version from public.profiles p
    left join private.social_avatars a on a.owner_id=p.owner_id
    where p.owner_id<>p_owner and position(lower(v_query) in lower(p.name))>0
      and private.social_author_active(p.owner_id)
      and not private.social_blocked(p_owner,p.owner_id)
    order by lower(p.name),p.owner_id limit 20
  ) visible;
  return v_result;
end;$$;

create function public.social_profile(p_owner uuid, p_session uuid, p_target uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_profile public.profiles; v_avatar uuid; v_posts jsonb;
begin
  if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  if p_target is null or (p_target<>p_owner and
    (not private.social_author_active(p_target) or private.social_blocked(p_owner,p_target))) then
    return null;
  end if;
  select * into v_profile from public.profiles where owner_id=p_target;
  if not found then return null; end if;
  select version into v_avatar from private.social_avatars where owner_id=p_target;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'authorId',author_id,'authorName',v_profile.name,'authorAvatarVersion',v_avatar,
    'body',body,'visibility',visibility,'snapshot',snapshot,'version',version,
    'createdAt',created_at,'mine',p_target=p_owner
  ) order by created_at desc,id desc),'[]'::jsonb) into v_posts from (
    select * from public.social_posts
    where author_id=p_target and status='active' and (p_target=p_owner or visibility='community')
    order by created_at desc,id desc limit 30
  ) own_posts;
  return jsonb_build_object('id',p_target,'name',v_profile.name,'mine',p_target=p_owner,
    'revision',case when p_target=p_owner then v_profile.revision else null end,
    'avatarVersion',v_avatar,'posts',v_posts);
end;$$;

create function public.social_profile_rename(p_owner uuid, p_session uuid, p_revision bigint, p_name text)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_revision bigint;
begin
  if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  if length(trim(p_name)) not between 1 and 60 then raise exception 'invalid name' using errcode='22023'; end if;
  update public.profiles set name=trim(p_name),revision=revision+1
    where owner_id=p_owner and revision=p_revision returning revision into v_revision;
  if v_revision is null then raise exception 'profile conflict' using errcode='40001'; end if;
  return v_revision;
end;$$;

create function public.social_avatar_put(p_owner uuid, p_session uuid, p_mime text, p_data text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_bytes bytea; v_version uuid;
begin
  if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  if p_mime not in ('image/jpeg','image/png','image/webp') or length(p_data)>700000 then
    raise exception 'invalid avatar' using errcode='22023'; end if;
  v_bytes:=decode(p_data,'base64');
  if octet_length(v_bytes) not between 1 and 524288 then raise exception 'invalid avatar' using errcode='22023'; end if;
  insert into private.social_avatars(owner_id,mime,bytes)
    values(p_owner,p_mime,v_bytes)
    on conflict(owner_id) do update set mime=excluded.mime,bytes=excluded.bytes,
      version=gen_random_uuid(),updated_at=now()
    returning version into v_version;
  return v_version;
end;$$;

create function public.social_avatar_remove(p_owner uuid, p_session uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  delete from private.social_avatars where owner_id=p_owner;
  return true;
end;$$;

create function public.social_avatar_get(p_owner uuid, p_session uuid, p_target uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_avatar private.social_avatars;
begin
  if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
  if p_target is null or (p_target<>p_owner and
    (not private.social_author_active(p_target) or private.social_blocked(p_owner,p_target))) then
    return null;
  end if;
  select * into v_avatar from private.social_avatars where owner_id=p_target;
  if not found then return null; end if;
  return jsonb_build_object('mime',v_avatar.mime,'data',encode(v_avatar.bytes,'base64'),
    'version',v_avatar.version);
end;$$;

create or replace function public.social_feed(p_owner uuid,p_session uuid,p_at timestamptz,p_id uuid,p_limit integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_result jsonb;begin
 if not private.social_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 if p_limit not between 1 and 30 or (p_at is null)<>(p_id is null) then raise exception 'invalid cursor' using errcode='22023';end if;
 with visible as (
  select p.*,pr.name as author_name,
    (select version from private.social_avatars a where a.owner_id=p.author_id) as avatar_version
  from public.social_posts p join public.profiles pr on pr.owner_id=p.author_id
  where p.status='active' and (p_at is null or (p.created_at,p.id)<(p_at,p_id))
   and (p.author_id=p_owner or (p.visibility='community' and private.social_author_active(p.author_id)
    and not private.social_blocked(p_owner,p.author_id)))
  order by p.created_at desc,p.id desc limit p_limit+1
 ), numbered as (select *,row_number() over(order by created_at desc,id desc) as rn from visible)
 select jsonb_build_object('posts',coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'authorId',author_id,'authorName',author_name,'authorAvatarVersion',avatar_version,
  'body',body,'visibility',visibility,'snapshot',snapshot,'version',version,'createdAt',created_at,'mine',author_id=p_owner
 ) order by created_at desc,id desc) filter(where rn<=p_limit),'[]'::jsonb),
 'hasMore',coalesce(bool_or(rn>p_limit),false)) into v_result from numbered;
 return v_result;
end;$$;

revoke all on function public.social_people(uuid,uuid,text), public.social_profile(uuid,uuid,uuid),
  public.social_profile_rename(uuid,uuid,bigint,text), public.social_avatar_put(uuid,uuid,text,text),
  public.social_avatar_remove(uuid,uuid), public.social_avatar_get(uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.social_people(uuid,uuid,text), public.social_profile(uuid,uuid,uuid),
  public.social_profile_rename(uuid,uuid,bigint,text), public.social_avatar_put(uuid,uuid,text,text),
  public.social_avatar_remove(uuid,uuid), public.social_avatar_get(uuid,uuid,uuid)
  to service_role;
