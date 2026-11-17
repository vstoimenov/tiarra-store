-- Edit an unshipped order atomically: snapshots, stock deltas and totals move together.
create or replace function store.admin_edit_order(p_order_number bigint, p_data jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, store as $$
declare
 saved store.orders%rowtype;
 old_item store.order_items%rowtype;
 entry jsonb; desired jsonb := '[]'::jsonb;
 product record; delta record; available integer;
 row_id uuid; v_product_id uuid; v_variant_id uuid; quantity integer;
 title text; variant_name text; unit_price numeric(10,2);
 new_subtotal numeric(10,2) := 0; new_shipping numeric(10,2); new_discount numeric(10,2);
begin
 select * into saved from store.orders where order_number=p_order_number for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if saved.status not in ('new','confirmed') then raise exception 'ORDER_NOT_EDITABLE'; end if;
 if saved.updated_at is distinct from (p_data->>'expectedVersion')::timestamptz then raise exception 'ORDER_CHANGED'; end if;
 if jsonb_typeof(p_data->'items') is distinct from 'array' then raise exception 'INVALID_ORDER'; end if;
 if jsonb_array_length(p_data->'items') not between 1 and 50
   or coalesce(length(trim(p_data->>'customerName')),0) not between 2 and 120
   or coalesce(length(trim(p_data->>'phone')),0) not between 7 and 30
   or coalesce(length(trim(p_data->>'deliveryAddress')),0) not between 5 and 500
   or coalesce(p_data->>'courier','') not in ('econt','speedy','boxnow')
   or coalesce(p_data->>'deliveryType','') not in ('office','automat','address')
   or (p_data->>'courier'='boxnow' and p_data->>'deliveryType'<>'automat')
   or (p_data->>'deliveryType'<>'address' and nullif(p_data->>'officeId','') is null)
   or (p_data->>'deliveryType'='address' and (nullif(p_data->>'officeId','') is not null or nullif(trim(p_data->>'city'),'') is null or nullif(trim(p_data->>'postCode'),'') is null))
 then raise exception 'INVALID_ORDER'; end if;
 new_shipping := (p_data->>'shipping')::numeric;
 new_discount := (p_data->>'discountAmount')::numeric;
 if new_shipping is null or new_discount is null or new_shipping<0 or new_discount<0 then raise exception 'INVALID_ORDER'; end if;

 for entry in select value from jsonb_array_elements(p_data->'items') loop
  row_id := nullif(entry->>'id','')::uuid;
  quantity := (entry->>'quantity')::integer;
  unit_price := (entry->>'unitPrice')::numeric;
  if quantity is null or quantity not between 1 and 99 or unit_price is null or unit_price<0 then raise exception 'INVALID_ORDER'; end if;
  if row_id is not null then
   select * into old_item from store.order_items where id=row_id and order_id=saved.id;
   if not found then raise exception 'INVALID_ORDER_ITEM'; end if;
   v_product_id := old_item.product_id; v_variant_id := old_item.variant_id;
   title := old_item.title; variant_name := old_item.variant_name;
   -- Deleted catalog rows can remain on an order, but cannot reserve extra stock.
   if (v_product_id is null or (v_variant_id is null and variant_name is not null)) and quantity>old_item.quantity then raise exception 'PRODUCT_NOT_FOUND'; end if;
  else
   v_product_id := (entry->>'productId')::uuid; v_variant_id := nullif(entry->>'variantId','')::uuid;
   select p.title,v.name as variant_name into product
   from store.products p left join store.variants v on v.id=v_variant_id and v.product_id=p.id
   where p.id=v_product_id and not p.is_hidden
    and ((v_variant_id is not null and v.id is not null) or (v_variant_id is null and not exists(select 1 from store.variants v2 where v2.product_id=p.id)));
   if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
   row_id := gen_random_uuid(); title := product.title; variant_name := product.variant_name;
  end if;
  if exists(select 1 from jsonb_array_elements(desired) x where (x->>'id')::uuid=row_id) then raise exception 'INVALID_ORDER_ITEM'; end if;
  desired := desired || jsonb_build_array(jsonb_build_object('id',row_id,'productId',v_product_id,'variantId',v_variant_id,'title',title,'variantName',variant_name,'quantity',quantity,'unitPrice',unit_price));
  new_subtotal := new_subtotal+unit_price*quantity;
 end loop;
 if new_discount>new_subtotal then raise exception 'INVALID_DISCOUNT'; end if;
 -- Lock in a stable order and reserve only the difference from the original items.
 for delta in
  select lines.pid,lines.vid,sum(lines.qty)::integer as qty from (
   select (x->>'productId')::uuid as pid,(x->>'variantId')::uuid as vid,(x->>'quantity')::integer as qty
    from jsonb_array_elements(desired) x where x->>'productId' is not null and not (x->>'variantId' is null and x->>'variantName' is not null)
   union all
   select oi.product_id,oi.variant_id,-oi.quantity from store.order_items oi
    where oi.order_id=saved.id and oi.product_id is not null and not (oi.variant_id is null and oi.variant_name is not null)
  ) lines group by lines.pid,lines.vid having sum(lines.qty)<>0 order by lines.pid,lines.vid nulls first
 loop
  if delta.vid is not null then
   select stock into available from store.variants v where v.id=delta.vid and v.product_id=delta.pid for update;
  else
   select stock into available from store.products where id=delta.pid for update;
  end if;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if available is not null then
   if available<delta.qty then raise exception 'INSUFFICIENT_STOCK'; end if;
   if delta.vid is not null then update store.variants set stock=stock-delta.qty where id=delta.vid;
   else update store.products set stock=stock-delta.qty,updated_at=now() where id=delta.pid; end if;
  end if;
 end loop;
 delete from store.order_items where order_id=saved.id;
 insert into store.order_items(id,order_id,product_id,variant_id,title,variant_name,unit_price,quantity,line_total)
 select (x->>'id')::uuid,saved.id,(x->>'productId')::uuid,(x->>'variantId')::uuid,x->>'title',x->>'variantName',(x->>'unitPrice')::numeric,(x->>'quantity')::integer,(x->>'unitPrice')::numeric*(x->>'quantity')::integer
 from jsonb_array_elements(desired) x;
 update store.orders set customer_name=trim(p_data->>'customerName'),phone=trim(p_data->>'phone'),email=nullif(trim(p_data->>'email'),''),
  courier=p_data->>'courier',delivery_type=p_data->>'deliveryType',office_id=nullif(p_data->>'officeId',''),city=nullif(trim(p_data->>'city'),''),post_code=nullif(trim(p_data->>'postCode'),''),
  delivery_address=trim(p_data->>'deliveryAddress'),notes=coalesce(p_data->>'notes',''),subtotal=new_subtotal,shipping=new_shipping,discount_amount=new_discount,total=new_subtotal+new_shipping-new_discount,
  internal_notes=concat_ws(E'\n',nullif(internal_notes,''),'Редакция от админ: '||to_char(clock_timestamp() at time zone 'Europe/Sofia','DD.MM.YYYY HH24:MI')||case when saved.ordyx_sync_status='synced' then ' — сверете промените и в Ordyx.' else '' end),
  updated_at=clock_timestamp()
 where id=saved.id;
end $$;
revoke all on function store.admin_edit_order(bigint,jsonb) from public,anon,authenticated;
grant execute on function store.admin_edit_order(bigint,jsonb) to tiarra_app;
