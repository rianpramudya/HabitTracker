-- Development foundation. No signup trigger, automatic grants, production seeds, or open writes.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table private.account_access (
 owner_id uuid primary key references auth.users(id),
 setup_complete boolean not null default false,
 status text not null default 'active' check(status in ('active','suspended'))
);
create table private.entitlements (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 status text not null check(status in ('active','revoked')),
 source text not null check(source in ('beta_grant','purchase')),
 starts_at timestamptz not null default now(), expires_at timestamptz,
 actor_id uuid not null references auth.users(id), reason text not null check(length(reason)>0),
 created_at timestamptz not null default now(), check(expires_at is null or expires_at>starts_at)
);
create unique index one_active_entitlement on private.entitlements(owner_id) where status='active';
create table private.session_guards (
 id uuid primary key references auth.sessions(id), owner_id uuid not null references auth.users(id),
 issued_at timestamptz not null, expires_at timestamptz not null, idle_expires_at timestamptz not null,
 revoked boolean not null default false, check(expires_at>issued_at)
);
create table private.roles(owner_id uuid not null references auth.users(id), role text not null check(role in ('admin','moderator','support')), primary key(owner_id,role));
create table private.audit(id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),action text not null,subject_id uuid,reason text not null,created_at timestamptz not null default now());
create table private.operations(owner_id uuid not null references auth.users(id),id uuid not null,input jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(owner_id,id));
create table private.rate_buckets(scope text not null,key_hash text not null,window_start timestamptz not null,hits integer not null check(hits>0),primary key(scope,key_hash,window_start));

-- Narrow lookup needed by RLS; current database state (not stale JWT roles/license) decides access.
create function private.product_access(p_owner uuid,p_session uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_owner is not null and exists(
  select 1 from private.account_access a
  join auth.users u on u.id=a.owner_id
  join private.entitlements e on e.owner_id=a.owner_id
  join private.session_guards g on g.owner_id=a.owner_id and g.id=p_session
  join auth.sessions s on s.id=g.id and s.user_id=a.owner_id
  where a.owner_id=p_owner and a.status='active' and a.setup_complete
   and u.email_confirmed_at is not null and e.status='active' and e.starts_at<=now()
   and (e.expires_at is null or e.expires_at>now())
   and not g.revoked and g.expires_at>now() and g.idle_expires_at>now()
   and (s.not_after is null or s.not_after>now())
 );
$$;
revoke all on function private.product_access(uuid,uuid) from public,anon,authenticated;
-- RLS uses a zero-argument wrapper so callers cannot inspect arbitrary account entitlement.
create function private.can_product() returns boolean language sql stable security definer set search_path='' as $$
 select private.product_access(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid);
$$;
revoke all on function private.can_product() from public,anon;
grant execute on function private.can_product() to authenticated;

create table public.profiles(owner_id uuid primary key references auth.users(id),name text not null check(length(name) between 1 and 60),revision bigint not null default 0);
create table public.preferences(owner_id uuid primary key references public.profiles(owner_id),language text not null default 'id' check(language in ('id','en')),theme text not null default 'system' check(theme in ('light','dark','system')),timezone text not null default 'Asia/Jakarta',enabled text[] not null default array['custom']);
create table public.habits(id text not null,owner_id uuid not null references public.profiles(owner_id),name text not null check(length(name) between 1 and 80),module text not null check(module in ('custom','exercise','water','study','fasting','finance')),kind text not null check(kind in ('checklist','count','duration')),unit text not null,created date not null,archived date,primary key(owner_id,id),check(archived is null or archived>=created));
create unique index one_water_habit on public.habits(owner_id) where module='water' and archived is null;
create table public.habit_rules(owner_id uuid not null,habit_id text not null,effective date not null,target bigint not null check(target>0 and target<=1000000000000),days integer[] not null check(cardinality(days)>0 and days<@array[0,1,2,3,4,5,6]),primary key(owner_id,habit_id,effective),foreign key(owner_id,habit_id) references public.habits(owner_id,id));
create table public.wallets(id text not null,owner_id uuid not null references public.profiles(owner_id),name text not null check(length(name) between 1 and 60),opening bigint not null check(abs(opening)<=1000000000000),archived boolean not null default false,primary key(owner_id,id));
create table public.entries(id text not null,owner_id uuid not null references public.profiles(owner_id),module text not null check(module in ('custom','exercise','water','study','fasting','finance','reflection')),local_date date not null,occurred_at timestamptz not null,timezone text not null,name text not null check(length(name) between 1 and 100),amount bigint not null check(amount>0 and amount<=1000000000000),habit_id text,type text not null check(type in ('log','income','expense','transfer')),wallet_id text,destination_id text,category text not null,method text not null,note text not null check(length(note)<=2000),version integer not null default 1 check(version>0),deleted boolean not null default false,primary key(owner_id,id),foreign key(owner_id,habit_id) references public.habits(owner_id,id),foreign key(owner_id,wallet_id) references public.wallets(owner_id,id),foreign key(owner_id,destination_id) references public.wallets(owner_id,id),check((type='log' and wallet_id is null and destination_id is null) or (type<>'log' and module='finance' and habit_id is null and wallet_id is not null and ((type='transfer' and destination_id is not null and destination_id<>wallet_id) or (type<>'transfer' and destination_id is null)))));
create index entries_owner_date on public.entries(owner_id,local_date,occurred_at desc,id desc) where not deleted;
create index entries_habit on public.entries(owner_id,habit_id);
create index entries_wallet on public.entries(owner_id,wallet_id);
create index entries_destination on public.entries(owner_id,destination_id);
create index guards_owner on private.session_guards(owner_id);

-- RLS covers exposed and private tables. No client mutation policies exist in this foundation.
do $$ declare t text; begin
 foreach t in array array['profiles','preferences','habits','habit_rules','wallets','entries'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy own_product_read on public.%I for select to authenticated using(owner_id=(select auth.uid()) and (select private.can_product()))',t);
 end loop;
 foreach t in array array['account_access','entitlements','session_guards','roles','audit','operations','rate_buckets'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end $$;

create function public.read_core() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; begin
 if not private.can_product() then raise exception 'access denied' using errcode='42501'; end if;
 select jsonb_build_object('revision',p.revision,'state',jsonb_build_object(
  'preferences',jsonb_build_object('name',p.name,'language',pr.language,'theme',pr.theme,'timezone',pr.timezone,'enabled',pr.enabled),
  'habits',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'name',h.name,'module',h.module,'kind',h.kind,'unit',h.unit,'created',h.created,'archived',h.archived,'rules',coalesce((select jsonb_agg(jsonb_build_object('effective',r.effective,'target',r.target,'days',r.days) order by r.effective) from public.habit_rules r where r.owner_id=h.owner_id and r.habit_id=h.id),'[]'::jsonb))) from public.habits h where h.owner_id=p.owner_id),'[]'::jsonb),
  'wallets',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'opening',w.opening,'archived',w.archived)) from public.wallets w where w.owner_id=p.owner_id),'[]'::jsonb),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'module',e.module,'date',e.local_date,'occurredAt',e.occurred_at,'timezone',e.timezone,'name',e.name,'amount',e.amount,'habitId',e.habit_id,'type',e.type,'walletId',e.wallet_id,'destinationId',e.destination_id,'category',e.category,'method',e.method,'note',e.note,'version',e.version,'deleted',e.deleted)) from public.entries e where e.owner_id=p.owner_id),'[]'::jsonb)
 )) into result from public.profiles p join public.preferences pr on pr.owner_id=p.owner_id where p.owner_id=auth.uid();
 return result;
end; $$;
revoke all on function public.read_core() from public,anon;
grant execute on function public.read_core() to authenticated;

-- Service-only transaction: the server applies validated domain commands. Clients cannot call this RPC.
-- Explicit fresh session/owner checks remain mandatory even with service-role credentials.
create function public.committed_operation(p_owner uuid,p_session uuid,p_operation uuid,p_input jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare previous private.operations;begin
 if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 select * into previous from private.operations where owner_id=p_owner and id=p_operation;
 if found then if previous.input<>p_input then raise exception 'operation key reused' using errcode='22023';end if;return previous.result;end if;
 return null;
end;$$;
revoke all on function public.committed_operation(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.committed_operation(uuid,uuid,uuid,jsonb) to service_role;

create function public.commit_core(p_owner uuid,p_session uuid,p_revision bigint,p_operation uuid,p_input jsonb,p_state jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_revision bigint;previous jsonb;h jsonb;r jsonb;e jsonb;w jsonb;pr jsonb;result jsonb;
begin
 -- Serialize all mutations per owner, then recheck authorization and idempotency under the lock.
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501';end if;
 previous:=public.committed_operation(p_owner,p_session,p_operation,p_input);if previous is not null then return previous;end if;
 select p.revision into v_revision from public.profiles p where owner_id=p_owner for update;
 if v_revision is null or v_revision<>p_revision then raise exception 'concurrent change' using errcode='40001';end if;
 pr:=p_state->'preferences';
 if not exists(select 1 from pg_timezone_names where name=pr->>'timezone') then raise exception 'invalid timezone';end if;
 update public.profiles set name=pr->>'name',revision=v_revision+1 where owner_id=p_owner;
 update public.preferences set language=pr->>'language',theme=pr->>'theme',timezone=pr->>'timezone',enabled=array(select jsonb_array_elements_text(pr->'enabled')) where owner_id=p_owner;
 -- Upsert preserves histories/FKs; domain does not physically remove financial records.
 for h in select * from jsonb_array_elements(p_state->'habits') loop
  insert into public.habits values(h->>'id',p_owner,h->>'name',h->>'module',h->>'kind',h->>'unit',(h->>'created')::date,(h->>'archived')::date)
  on conflict(owner_id,id) do update set archived=excluded.archived;
  for r in select * from jsonb_array_elements(h->'rules') loop
   insert into public.habit_rules values(p_owner,h->>'id',(r->>'effective')::date,(r->>'target')::bigint,array(select jsonb_array_elements_text(r->'days'))::integer[])
   on conflict(owner_id,habit_id,effective) do nothing;
  end loop;
 end loop;
 for w in select * from jsonb_array_elements(p_state->'wallets') loop
  insert into public.wallets values(w->>'id',p_owner,w->>'name',(w->>'opening')::bigint,(w->>'archived')::boolean)
  on conflict(owner_id,id) do update set archived=excluded.archived;
 end loop;
 for e in select * from jsonb_array_elements(p_state->'entries') loop
  insert into public.entries values(e->>'id',p_owner,e->>'module',(e->>'date')::date,(e->>'occurredAt')::timestamptz,e->>'timezone',e->>'name',(e->>'amount')::bigint,e->>'habitId',e->>'type',e->>'walletId',e->>'destinationId',e->>'category',e->>'method',e->>'note',(e->>'version')::integer,(e->>'deleted')::boolean)
  on conflict(owner_id,id) do update set module=excluded.module,local_date=excluded.local_date,occurred_at=excluded.occurred_at,timezone=excluded.timezone,name=excluded.name,amount=excluded.amount,habit_id=excluded.habit_id,type=excluded.type,wallet_id=excluded.wallet_id,destination_id=excluded.destination_id,category=excluded.category,method=excluded.method,note=excluded.note,version=excluded.version,deleted=excluded.deleted;
 end loop;
 result:=jsonb_build_object('state',p_state,'revision',v_revision+1);
 insert into private.operations(owner_id,id,input,result) values(p_owner,p_operation,p_input,result);
 return result;
end;$$;
revoke all on function public.commit_core(uuid,uuid,bigint,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_core(uuid,uuid,bigint,uuid,jsonb,jsonb) to service_role;
grant select,insert,update on all tables in schema public to service_role;
grant select,insert,update on all tables in schema private to service_role;
grant execute on function private.product_access(uuid,uuid) to service_role;
