-- Private, server-managed promotions. Usage counts completed creations, including later cancellations.
create table store.promo_codes (
 code text primary key check (code ~ '^[A-Z0-9_-]{3,32}$'),
 kind text not null check (kind in ('percent','fixed')),
 value numeric(10,2) not null check (value > 0),
 min_subtotal numeric(10,2) not null default 0 check (min_subtotal >= 0),
 expires_at timestamptz,
 max_uses integer check (max_uses > 0),
 uses integer not null default 0 check (uses >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 check (kind <> 'percent' or value <= 100)
);
alter table store.promo_codes enable row level security;
revoke all on store.promo_codes from public, anon, authenticated;
grant select, insert, update on store.promo_codes to tiarra_app;
create policy tiarra_app_promos on store.promo_codes for all to tiarra_app using (true) with check (true);
alter table store.orders add column promo_code text, add column discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0);

create function store.promo_discount(p_code text, p_subtotal numeric) returns numeric
language plpgsql security invoker set search_path = pg_catalog, store as $$
declare promo store.promo_codes%rowtype;
begin
 if nullif(trim(p_code),'') is null then return 0; end if;
 select * into promo from store.promo_codes where code = upper(trim(p_code));
 if not found or not promo.active or (promo.expires_at is not null and promo.expires_at <= now())
   or (promo.max_uses is not null and promo.uses >= promo.max_uses) then raise exception 'PROMO_INVALID'; end if;
 if p_subtotal < promo.min_subtotal then raise exception 'PROMO_MINIMUM'; end if;
 return least(p_subtotal, round(case when promo.kind='percent' then p_subtotal*promo.value/100 else promo.value end,2));
end $$;
revoke all on function store.promo_discount(text,numeric) from public, anon, authenticated;
grant execute on function store.promo_discount(text,numeric) to tiarra_app;

-- Reuse the existing stock/idempotency transaction. Exceptions roll back the entire call.
create function store.create_order_with_promo(
 p_request_id uuid, p_customer_name text, p_phone text, p_email text, p_courier text,
 p_delivery_type text, p_office_id text, p_city text, p_post_code text,
 p_delivery_address text, p_notes text, p_items jsonb, p_promo_code text
) returns table(order_number bigint,total numeric,is_new boolean)
language plpgsql security invoker set search_path = pg_catalog, store as $$
declare result record; saved record; reduction numeric(10,2); normalized text := nullif(upper(trim(p_promo_code)),'');
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select o.order_number,o.total into saved from store.orders o where o.request_id=p_request_id;
 if found then return query select saved.order_number,saved.total,false; return; end if;
 -- Serialize redemption of the final available use, and concurrent admin changes.
 if normalized is not null then
  perform 1 from store.promo_codes where code=normalized for update;
  if not found then raise exception 'PROMO_INVALID'; end if;
 end if;
 select * into result from store.create_order(p_request_id,p_customer_name,p_phone,p_email,p_courier,
   p_delivery_type,p_office_id,p_city,p_post_code,p_delivery_address,p_notes,p_items);
 select o.subtotal,o.total into saved from store.orders o where o.order_number=result.order_number;
 reduction := store.promo_discount(normalized,saved.subtotal);
 if normalized is not null then
  update store.orders o set promo_code=normalized,discount_amount=reduction,total=o.total-reduction where o.order_number=result.order_number;
  update store.promo_codes set uses=uses+1 where code=normalized;
 end if;
 return query select result.order_number,saved.total-reduction,true;
end $$;
revoke all on function store.create_order_with_promo(uuid,text,text,text,text,text,text,text,text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function store.create_order_with_promo(uuid,text,text,text,text,text,text,text,text,text,text,jsonb,text) to tiarra_app;
