alter table store.commerce_settings add column econt_address_enabled boolean not null default true, add column speedy_address_enabled boolean not null default true;

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
 if (p_courier='econt' and not config.econt_enabled) or (p_courier='speedy' and not config.speedy_enabled) or (p_delivery_type='address' and ((p_courier='econt' and not config.econt_address_enabled) or (p_courier='speedy' and not config.speedy_address_enabled))) or (p_courier='boxnow' and (not config.boxnow_enabled or p_delivery_type<>'automat'))
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
