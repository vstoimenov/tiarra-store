-- Keep order status transitions and inventory restoration atomic and idempotent.
alter table store.orders
  add column cancelled_at timestamptz,
  add column stock_released_at timestamptz,
  add column ordyx_cancel_status text not null default 'not_requested'
    check (ordyx_cancel_status in ('not_requested', 'pending', 'cancelled', 'failed')),
  add column ordyx_cancel_error text,
  add column ordyx_cancelled_at timestamptz;

create index order_items_product_id_idx on store.order_items (product_id);
create index order_items_variant_id_idx on store.order_items (variant_id);

create function store.update_order_status(p_order_number bigint, p_status text)
returns table (
  order_number bigint,
  status text,
  changed boolean,
  stock_released boolean,
  ordyx_cancel_required boolean
)
language plpgsql
security definer
set search_path = pg_catalog, store
as $$
declare
  current_order store.orders%rowtype;
  item record;
  released boolean := false;
begin
  if p_status not in ('new', 'confirmed', 'sent', 'completed', 'cancelled') then
    raise exception 'INVALID_ORDER_STATUS';
  end if;

  select * into current_order
  from store.orders o
  where o.order_number = p_order_number
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if current_order.status = p_status then
    return query select current_order.order_number, current_order.status, false, false,
      current_order.ordyx_cancel_status in ('pending', 'failed');
    return;
  end if;

  if not (
    (current_order.status = 'new' and p_status in ('confirmed', 'cancelled')) or
    (current_order.status = 'confirmed' and p_status in ('sent', 'cancelled')) or
    (current_order.status = 'sent' and p_status = 'completed')
  ) then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  if p_status = 'cancelled' and current_order.stock_released_at is null then
    for item in
      select oi.product_id, oi.variant_id, oi.quantity
      from store.order_items oi where oi.order_id = current_order.id
    loop
      if item.variant_id is not null then
        update store.variants set stock = stock + item.quantity
        where id = item.variant_id and stock is not null;
      elsif item.product_id is not null then
        update store.products set stock = stock + item.quantity, updated_at = now()
        where id = item.product_id and stock is not null;
      end if;
    end loop;
    released := true;
  end if;

  update store.orders o set
    status = p_status,
    cancelled_at = case when p_status = 'cancelled' then now() else o.cancelled_at end,
    stock_released_at = case when p_status = 'cancelled' and o.stock_released_at is null then now() else o.stock_released_at end,
    ordyx_cancel_status = case
      when p_status = 'cancelled' and o.ordyx_sync_status = 'synced' then 'pending'
      when p_status = 'cancelled' then 'cancelled'
      else o.ordyx_cancel_status
    end,
    ordyx_cancel_error = case when p_status = 'cancelled' then null else o.ordyx_cancel_error end
  where o.id = current_order.id;

  return query
  select o.order_number, o.status, true, released,
    o.ordyx_cancel_status = 'pending'
  from store.orders o where o.id = current_order.id;
end
$$;

revoke all on function store.update_order_status(bigint, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'tiarra_app') then
    grant execute on function store.update_order_status(bigint, text) to tiarra_app;
  end if;
end
$$;
