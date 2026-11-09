alter table store.promo_codes add column brands text[] not null default '{}';

create function store.promo_discount_for_items(p_code text, p_subtotal numeric, p_items jsonb) returns numeric
language plpgsql security invoker set search_path = pg_catalog, store as $$
declare promo store.promo_codes%rowtype; eligible numeric;
begin
 if nullif(trim(p_code),'') is null then return 0; end if;
 select * into promo from store.promo_codes where code=upper(trim(p_code));
 if not found or not promo.active or (promo.expires_at is not null and promo.expires_at<=now()) or (promo.max_uses is not null and promo.uses>=promo.max_uses) then raise exception 'PROMO_INVALID'; end if;
 if p_subtotal < promo.min_subtotal then raise exception 'PROMO_MINIMUM'; end if;
 if cardinality(promo.brands)=0 then eligible := p_subtotal;
 else
  select coalesce(sum((case when nullif(item->>'variantId','') is null then p.price else v.price end) * (item->>'quantity')::int),0)
  into eligible from jsonb_array_elements(p_items) item
  join store.products p on p.id=(item->>'productId')::uuid
  left join store.variants v on v.id=nullif(item->>'variantId','')::uuid and v.product_id=p.id
  where lower(trim(p.brand)) in (select lower(trim(b)) from unnest(promo.brands) b);
  if eligible <= 0 then raise exception 'PROMO_BRAND'; end if;
 end if;
 return least(eligible, round(case when promo.kind='percent' then eligible*promo.value/100 else promo.value end,2));
end $$;
revoke all on function store.promo_discount_for_items(text,numeric,jsonb) from public,anon,authenticated;
grant execute on function store.promo_discount_for_items(text,numeric,jsonb) to tiarra_app;

create or replace function store.create_order_with_promo(
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
 reduction := store.promo_discount_for_items(normalized,saved.subtotal,p_items);
 if normalized is not null then
  update store.orders o set promo_code=normalized,discount_amount=reduction,total=o.total-reduction where o.order_number=result.order_number;
  update store.promo_codes set uses=uses+1 where code=normalized;
 end if;
 return query select result.order_number,saved.total-reduction,true;
end $$;
