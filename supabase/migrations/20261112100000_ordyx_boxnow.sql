alter table store.orders drop constraint orders_courier_check;
alter table store.orders add constraint orders_courier_check check (courier in ('econt','speedy','boxnow'));
alter table store.commerce_settings add column boxnow_enabled boolean not null default false, add column boxnow_price numeric(10,2) not null default 2.49 check (boxnow_price between 0 and 100);
alter table store.commerce_settings drop constraint commerce_settings_check;
alter table store.commerce_settings add constraint commerce_settings_courier_check check (econt_enabled or speedy_enabled or boxnow_enabled);

create or replace function store.create_order(
  p_request_id uuid,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_courier text,
  p_delivery_type text,
  p_office_id text,
  p_city text,
  p_post_code text,
  p_delivery_address text,
  p_notes text,
  p_items jsonb
) returns table (order_number bigint, total numeric, is_new boolean)
language plpgsql
security definer
set search_path = pg_catalog, store
as $$
declare
  item record;
  product record;
  order_id uuid;
  created_number bigint;
  existing_order record;
  subtotal numeric(10,2) := 0;
  shipping numeric(10,2);
begin
  if p_request_id is null
    or p_courier not in ('econt', 'speedy', 'boxnow')
    or p_delivery_type not in ('office', 'automat', 'address')
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
  then
    raise exception 'INVALID_ORDER';
  end if;

  -- Serialize requests carrying the same id before touching inventory.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select o.order_number, o.total into existing_order
  from store.orders o where o.request_id = p_request_id;
  if found then
    return query select existing_order.order_number, existing_order.total, false;
    return;
  end if;

  -- Aggregate duplicate cart rows, lock each stock row and reserve it now.
  for item in
    select
      (entry->>'productId')::uuid as product_id,
      nullif(entry->>'variantId', '')::uuid as variant_id,
      sum((entry->>'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) entry
    group by (entry->>'productId')::uuid, nullif(entry->>'variantId', '')::uuid
  loop
    if item.quantity < 1 or item.quantity > 99 then raise exception 'INVALID_ORDER'; end if;

    if item.variant_id is null then
      select p.id, null::uuid as variant_id, p.title, null::text as variant_name, p.price, p.stock
      into product
      from store.products p
      where p.id = item.product_id and not p.is_hidden
        and not exists (select 1 from store.variants v where v.product_id = p.id)
      for update of p;
    else
      select p.id, v.id as variant_id, p.title, v.name as variant_name, v.price, v.stock
      into product
      from store.products p join store.variants v on v.product_id = p.id
      where p.id = item.product_id and v.id = item.variant_id and not p.is_hidden
      for update of v;
    end if;

    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if product.stock is not null and product.stock < item.quantity then raise exception 'INSUFFICIENT_STOCK'; end if;

    if product.stock is not null then
      if item.variant_id is null then
        update store.products set stock = stock - item.quantity, updated_at = now() where id = item.product_id;
      else
        update store.variants set stock = stock - item.quantity where id = item.variant_id;
      end if;
    end if;
    subtotal := subtotal + product.price * item.quantity;
  end loop;

  shipping := case when subtotal >= 39 then 0 when p_courier = 'econt' then 4.5 else 3.5 end;
  insert into store.orders (
    request_id, customer_name, phone, email, courier, delivery_type,
    office_id, city, post_code, delivery_address, notes, subtotal, shipping, total
  ) values (
    p_request_id, p_customer_name, p_phone, nullif(p_email, ''), p_courier, p_delivery_type,
    nullif(p_office_id, ''), nullif(p_city, ''), nullif(p_post_code, ''),
    p_delivery_address, p_notes, subtotal, shipping, subtotal + shipping
  ) returning id, store.orders.order_number into order_id, created_number;

  for item in
    select
      (entry->>'productId')::uuid as product_id,
      nullif(entry->>'variantId', '')::uuid as variant_id,
      sum((entry->>'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) entry
    group by (entry->>'productId')::uuid, nullif(entry->>'variantId', '')::uuid
  loop
    if item.variant_id is null then
      select p.id, null::uuid as variant_id, p.title, null::text as variant_name, p.price
      into product from store.products p where p.id = item.product_id;
    else
      select p.id, v.id as variant_id, p.title, v.name as variant_name, v.price
      into product from store.products p join store.variants v on v.product_id = p.id
      where p.id = item.product_id and v.id = item.variant_id;
    end if;
    insert into store.order_items (order_id, product_id, variant_id, title, variant_name, unit_price, quantity, line_total)
    values (order_id, product.id, product.variant_id, product.title, product.variant_name, product.price, item.quantity, product.price * item.quantity);
  end loop;

  return query select created_number, subtotal + shipping, true;
end
$$;


create or replace function store.create_order_with_settings_and_promo(
 p_request_id uuid, p_customer_name text, p_phone text, p_email text, p_courier text,
 p_delivery_type text, p_office_id text, p_city text, p_post_code text,
 p_delivery_address text, p_notes text, p_items jsonb, p_promo_code text
) returns table(order_number bigint,total numeric,is_new boolean)
language plpgsql security invoker set search_path=pg_catalog,store as $$
declare result record; config store.commerce_settings%rowtype; new_shipping numeric(10,2);
begin
 select * into result from store.create_order_with_promo(p_request_id,p_customer_name,p_phone,p_email,p_courier,
   p_delivery_type,p_office_id,p_city,p_post_code,p_delivery_address,p_notes,p_items,p_promo_code);
 if not result.is_new then return query select result.order_number,result.total,false; return; end if;
 select * into config from store.commerce_settings where singleton;
 if (p_courier='econt' and not config.econt_enabled) or (p_courier='speedy' and not config.speedy_enabled) or (p_courier='boxnow' and (not config.boxnow_enabled or p_delivery_type<>'automat'))
   then raise exception 'COURIER_DISABLED'; end if;
 select case
   when o.subtotal>=config.free_shipping_threshold then 0
   when p_courier='boxnow' then config.boxnow_price
   when p_courier='econt' and p_delivery_type='address' then config.econt_address_price
   when p_courier='econt' then config.econt_office_price
   when p_delivery_type='address' then config.speedy_address_price
   else config.speedy_office_price end into new_shipping
 from store.orders o where o.order_number=result.order_number;
 update store.orders o set shipping=new_shipping,total=o.subtotal+new_shipping-o.discount_amount
 where o.order_number=result.order_number;
 return query select o.order_number,o.total,true from store.orders o where o.order_number=result.order_number;
end $$;
