-- Consent-based, first-party session counts. No IP address or browser fingerprint is stored.
create table store.visit_sessions (
 id uuid primary key,
 visitor_id uuid not null,
 started_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 page_views integer not null default 1 check(page_views>0)
);
create index visit_sessions_started_idx on store.visit_sessions(started_at);
alter table store.visit_sessions enable row level security;
create policy visit_sessions_app on store.visit_sessions for all to tiarra_app using(true) with check(true);
grant select,insert,update on store.visit_sessions to tiarra_app;
alter table store.orders add column visit_session_id uuid;
create index orders_visit_session_idx on store.orders(visit_session_id) where visit_session_id is not null;
alter table store.order_items add column attribution text not null default 'direct' check(attribution in ('direct','bump','upsell'));
-- Whitelisted attribution tied to a created order, never to arbitrary rows supplied by the browser.
create function store.attach_order_attribution(p_order_number bigint,p_session_id uuid,p_items jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,store as $$
declare chosen record; target uuid;
begin
 select id into target from store.orders where order_number=p_order_number for update;
 if target is null then raise exception 'ORDER_NOT_FOUND'; end if;
 update store.orders set visit_session_id=p_session_id where id=target and visit_session_id is null;
 for chosen in select (entry->>'productId')::uuid as product_id,nullif(entry->>'variantId','')::uuid as variant_id,
  case when entry->>'source' in ('bump','upsell') then entry->>'source' else 'direct' end as source
  from jsonb_array_elements(p_items) entry
 loop
  update store.order_items set attribution=chosen.source where order_id=target
   and product_id=chosen.product_id and variant_id is not distinct from chosen.variant_id;
 end loop;
end $$;
revoke all on function store.attach_order_attribution(bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function store.attach_order_attribution(bigint,uuid,jsonb) to tiarra_app;
