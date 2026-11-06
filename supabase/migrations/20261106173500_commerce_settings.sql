-- One source of truth for storefront integrations and delivery pricing.
create table store.commerce_settings (
  singleton boolean primary key default true check (singleton),
  google_analytics_id text check (google_analytics_id is null or google_analytics_id ~ '^G-[A-Z0-9]+$'),
  google_tag_manager_id text check (google_tag_manager_id is null or google_tag_manager_id ~ '^GTM-[A-Z0-9]+$'),
  meta_pixel_id text check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{5,25}$'),
  free_shipping_threshold numeric(10,2) not null default 39 check (free_shipping_threshold >= 0),
  econt_enabled boolean not null default true,
  econt_office_price numeric(10,2) not null default 4.50 check (econt_office_price >= 0),
  econt_address_price numeric(10,2) not null default 6.50 check (econt_address_price >= 0),
  speedy_enabled boolean not null default true,
  speedy_office_price numeric(10,2) not null default 3.50 check (speedy_office_price >= 0),
  speedy_address_price numeric(10,2) not null default 5.50 check (speedy_address_price >= 0),
  delivery_estimate text not null default '1–2 работни дни' check (char_length(delivery_estimate) between 2 and 80),
  dispatch_hours integer not null default 24 check (dispatch_hours between 1 and 168),
  updated_at timestamptz not null default now(),
  check (econt_enabled or speedy_enabled)
);
insert into store.commerce_settings(singleton) values(true);
alter table store.commerce_settings enable row level security;
revoke all on store.commerce_settings from public,anon,authenticated;
grant select,update on store.commerce_settings to tiarra_app;
create policy commerce_settings_read on store.commerce_settings for select to tiarra_app using(singleton);
create policy commerce_settings_update on store.commerce_settings for update to tiarra_app using(singleton) with check(singleton);

-- Keep checkout totals authoritative in Postgres while allowing prices to be changed in Admin.
create function store.create_order_with_settings_and_promo(
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
 if (p_courier='econt' and not config.econt_enabled) or (p_courier='speedy' and not config.speedy_enabled)
   then raise exception 'COURIER_DISABLED'; end if;
 select case
   when o.subtotal>=config.free_shipping_threshold then 0
   when p_courier='econt' and p_delivery_type='address' then config.econt_address_price
   when p_courier='econt' then config.econt_office_price
   when p_delivery_type='address' then config.speedy_address_price
   else config.speedy_office_price end into new_shipping
 from store.orders o where o.order_number=result.order_number;
 update store.orders o set shipping=new_shipping,total=o.subtotal+new_shipping-o.discount_amount
 where o.order_number=result.order_number;
 return query select o.order_number,o.total,true from store.orders o where o.order_number=result.order_number;
end $$;
revoke all on function store.create_order_with_settings_and_promo(uuid,text,text,text,text,text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function store.create_order_with_settings_and_promo(uuid,text,text,text,text,text,text,text,text,text,text,jsonb,text) to tiarra_app;
