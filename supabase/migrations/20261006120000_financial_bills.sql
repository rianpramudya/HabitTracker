-- Financial obligations and user-managed labels. New migration; core ledger remains the cash-flow source.
create table public.financial_options (
 owner_id uuid not null references public.profiles(owner_id),
 id uuid not null default gen_random_uuid(),
 kind text not null check (kind in ('category','method')),
 name text not null check (length(btrim(name)) between 1 and 60),
 archived boolean not null default false,
 primary key(owner_id,id)
);
create unique index financial_options_live_name on public.financial_options(owner_id,kind,lower(name)) where not archived;

create table public.financial_bills (
 owner_id uuid not null references public.profiles(owner_id),
 id uuid not null default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 100),
 amount bigint not null check (amount > 0 and amount <= 1000000000000),
 due_date date not null,
 frequency text not null default 'once' check (frequency in ('once','weekly','monthly')),
 category text not null check (length(btrim(category)) between 1 and 60),
 note text not null default '' check (length(note) <= 2000),
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create index financial_bills_due on public.financial_bills(owner_id,due_date) where not archived;

create table public.financial_bill_payments (
 owner_id uuid not null,
 id uuid not null default gen_random_uuid(),
 bill_id uuid not null,
 entry_id text not null,
 amount bigint not null check (amount > 0),
 created_at timestamptz not null default now(),
 primary key(owner_id,id),
 unique(owner_id,entry_id),
 foreign key(owner_id,bill_id) references public.financial_bills(owner_id,id),
 foreign key(owner_id,entry_id) references public.entries(owner_id,id)
);
create index financial_payments_bill on public.financial_bill_payments(owner_id,bill_id);

do $$ declare t text; begin
 foreach t in array array['financial_options','financial_bills','financial_bill_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy own_financial_read on public.%I for select to authenticated using(owner_id=(select auth.uid()) and (select private.can_product()))',t);
 end loop;
end $$;

-- Generic entry edits/deletes must never detach a bill payment from its cash-flow row.
create function private.protect_bill_entry() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.financial_bill_payments p where p.owner_id=old.owner_id and p.entry_id=old.id)
    and (tg_op='DELETE' or to_jsonb(new) is distinct from to_jsonb(old)) then
  raise exception 'bill payment entry is immutable' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger protect_bill_entry before update or delete on public.entries
 for each row execute function private.protect_bill_entry();
revoke all on function private.protect_bill_entry() from public,anon,authenticated;

create function public.financial_read() returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_owner uuid; result jsonb;
begin
 v_owner:=auth.uid();
 if not private.can_product() then raise exception 'access denied' using errcode='42501'; end if;
 select jsonb_build_object(
  'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'name',o.name,'archived',o.archived) order by o.kind,o.name) from public.financial_options o where o.owner_id=v_owner),'[]'::jsonb),
  'bills',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'amount',b.amount,'dueDate',b.due_date,'frequency',b.frequency,'category',b.category,'note',b.note,'archived',b.archived,'paid',coalesce((select sum(p.amount) from public.financial_bill_payments p where p.owner_id=b.owner_id and p.bill_id=b.id),0)) order by b.due_date,b.created_at) from public.financial_bills b where b.owner_id=v_owner),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'billId',p.bill_id,'entryId',p.entry_id,'amount',p.amount,'createdAt',p.created_at) order by p.created_at) from public.financial_bill_payments p where p.owner_id=v_owner),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.financial_read() from public,anon;
grant execute on function public.financial_read() to authenticated;

-- One serialized transaction changes a bill and the existing ledger, with a durable operation key.
create function public.financial_command(p_owner uuid,p_session uuid,p_operation uuid,p_input jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_action text; v_revision bigint; v_bill public.financial_bills; v_remaining bigint; v_amount bigint;
 v_wallet text; v_timezone text; v_entry text; v_result jsonb; v_id uuid; v_name text; v_kind text; v_previous jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 if not private.product_access(p_owner,p_session) then raise exception 'access denied' using errcode='42501'; end if;
 v_previous:=public.committed_operation(p_owner,p_session,p_operation,p_input);
 if v_previous is not null then return v_previous; end if;
 select revision into v_revision from public.profiles where owner_id=p_owner for update;
 if v_revision is null then raise exception 'profile missing' using errcode='42501'; end if;
 v_action:=p_input->>'action';
 if v_action='bill.create' then
  v_amount:=(p_input->>'amount')::bigint;
  if v_amount<=0 or v_amount>1000000000000 or length(btrim(p_input->>'name')) not between 1 and 100
    or length(btrim(p_input->>'category')) not between 1 and 60
    or coalesce(length(p_input->>'note'),0)>2000 then raise exception 'invalid bill' using errcode='22023'; end if;
  insert into public.financial_bills(owner_id,name,amount,due_date,frequency,category,note)
  values(p_owner,btrim(p_input->>'name'),v_amount,(p_input->>'dueDate')::date,p_input->>'frequency',btrim(p_input->>'category'),coalesce(p_input->>'note','')) returning id into v_id;
  v_result:=jsonb_build_object('id',v_id);
 elsif v_action='bill.archive' then
  update public.financial_bills set archived=true where owner_id=p_owner and id=(p_input->>'id')::uuid and not archived returning id into v_id;
  if v_id is null then raise exception 'bill unavailable' using errcode='22023'; end if;
  v_result:=jsonb_build_object('id',v_id);
 elsif v_action='bill.pay' then
  select * into v_bill from public.financial_bills where owner_id=p_owner and id=(p_input->>'id')::uuid for update;
  if v_bill.id is null or v_bill.archived then raise exception 'bill unavailable' using errcode='22023'; end if;
  select v_bill.amount-coalesce(sum(amount),0) into v_remaining from public.financial_bill_payments where owner_id=p_owner and bill_id=v_bill.id;
  v_amount:=(p_input->>'amount')::bigint;
  v_wallet:=p_input->>'walletId';
  if v_amount<=0 or v_amount>v_remaining then raise exception 'payment exceeds remaining obligation' using errcode='22023'; end if;
  if not exists(select 1 from public.wallets where owner_id=p_owner and id=v_wallet and not archived) then raise exception 'wallet unavailable' using errcode='22023'; end if;
  if length(btrim(p_input->>'method')) not between 1 and 60 then raise exception 'invalid payment method' using errcode='22023'; end if;
  select timezone into v_timezone from public.preferences where owner_id=p_owner;
  v_entry:=p_operation::text;
  insert into public.entries(id,owner_id,module,local_date,occurred_at,timezone,name,amount,habit_id,type,wallet_id,destination_id,category,method,note,version,deleted)
  values(v_entry,p_owner,'finance',(now() at time zone v_timezone)::date,now(),v_timezone,v_bill.name,v_amount,null,'expense',v_wallet,null,v_bill.category,btrim(p_input->>'method'),v_bill.note,1,false);
  insert into public.financial_bill_payments(owner_id,bill_id,entry_id,amount) values(p_owner,v_bill.id,v_entry,v_amount) returning id into v_id;
  v_result:=jsonb_build_object('id',v_id,'entryId',v_entry,'remaining',v_remaining-v_amount);
 elsif v_action='option.create' then
  v_kind:=p_input->>'kind'; v_name:=btrim(p_input->>'name');
  if v_kind not in ('category','method') or length(v_name) not between 1 and 60 then raise exception 'invalid option' using errcode='22023'; end if;
  insert into public.financial_options(owner_id,kind,name) values(p_owner,v_kind,v_name) returning id into v_id;
  v_result:=jsonb_build_object('id',v_id);
 elsif v_action='option.archive' then
  update public.financial_options set archived=true where owner_id=p_owner and id=(p_input->>'id')::uuid and not archived returning id into v_id;
  if v_id is null then raise exception 'option unavailable' using errcode='22023'; end if;
  v_result:=jsonb_build_object('id',v_id);
 elsif v_action='wallet.rename' then
  v_name:=btrim(p_input->>'name');
  if length(v_name) not between 1 and 60 then raise exception 'invalid wallet name' using errcode='22023'; end if;
  update public.wallets set name=v_name where owner_id=p_owner and id=p_input->>'id' and not archived returning id into v_wallet;
  if v_wallet is null then raise exception 'wallet unavailable' using errcode='22023'; end if;
  v_result:=jsonb_build_object('id',v_wallet);
 else
  raise exception 'unknown financial action' using errcode='22023';
 end if;
 update public.profiles set revision=v_revision+1 where owner_id=p_owner;
 insert into private.operations(owner_id,id,input,result) values(p_owner,p_operation,p_input,v_result);
 return v_result;
end $$;
revoke all on function public.financial_command(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.financial_command(uuid,uuid,uuid,jsonb) to service_role;
grant select,insert,update on public.financial_options,public.financial_bills,public.financial_bill_payments to service_role;
