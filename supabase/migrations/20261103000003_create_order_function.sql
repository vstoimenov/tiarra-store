create or replace function store.create_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_courier text,
  p_delivery_address text,
  p_notes text,
  p_items jsonb
) returns table (order_number bigint, total numeric)
language plpgsql
security definer
set search_path = pg_catalog, store
as $$
declare
  item jsonb;
  product record;
  order_id uuid;
  created_number bigint;
  subtotal numeric(10,2) := 0;
  shipping numeric(10,2);
  quantity int;
  product_id uuid;
  variant_id uuid;
begin
  if p_courier not in ('econt', 'speedy') or jsonb_array_length(p_items) < 1 then
    raise exception 'INVALID_ORDER';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    quantity := (item->>'quantity')::int;
    product_id := (item->>'productId')::uuid;
    variant_id := nullif(item->>'variantId', '')::uuid;
    if quantity < 1 or quantity > 99 then raise exception 'INVALID_ORDER'; end if;

    if variant_id is null then
      select p.id, null::uuid as variant_id, p.title, null::text as variant_name, p.price, p.stock
      into product from store.products p
      where p.id = product_id and not p.is_hidden
        and not exists (select 1 from store.variants v where v.product_id = p.id);
    else
      select p.id, v.id as variant_id, p.title, v.name as variant_name, v.price, v.stock
      into product from store.products p join store.variants v on v.product_id = p.id
      where p.id = product_id and v.id = variant_id and not p.is_hidden;
    end if;

    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if product.stock is not null and product.stock < quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
    subtotal := subtotal + product.price * quantity;
  end loop;

  shipping := case when subtotal >= 39 then 0 when p_courier = 'econt' then 4.5 else 3.5 end;
  insert into store.orders (customer_name, phone, email, courier, delivery_address, notes, subtotal, shipping, total)
  values (p_customer_name, p_phone, nullif(p_email, ''), p_courier, p_delivery_address, p_notes, subtotal, shipping, subtotal + shipping)
  returning id, store.orders.order_number into order_id, created_number;

  for item in select value from jsonb_array_elements(p_items)
  loop
    quantity := (item->>'quantity')::int;
    product_id := (item->>'productId')::uuid;
    variant_id := nullif(item->>'variantId', '')::uuid;
    if variant_id is null then
      select p.id, null::uuid as variant_id, p.title, null::text as variant_name, p.price, p.stock
      into product from store.products p where p.id = product_id;
    else
      select p.id, v.id as variant_id, p.title, v.name as variant_name, v.price, v.stock
      into product from store.products p join store.variants v on v.product_id = p.id
      where p.id = product_id and v.id = variant_id;
    end if;
    insert into store.order_items (order_id, product_id, variant_id, title, variant_name, unit_price, quantity, line_total)
    values (order_id, product.id, product.variant_id, product.title, product.variant_name, product.price, quantity, product.price * quantity);
  end loop;

  return query select created_number, subtotal + shipping;
end
$$;

revoke all on function store.create_order(text,text,text,text,text,text,jsonb) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'tiarra_app') then
    revoke all on store.orders, store.order_items from tiarra_app;
    revoke all on sequence store.orders_order_number_seq from tiarra_app;
    grant execute on function store.create_order(text,text,text,text,text,text,jsonb) to tiarra_app;
  end if;
end
$$;
