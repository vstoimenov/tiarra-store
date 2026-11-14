-- Append variants without replacing existing variants referenced by orders.
create or replace function store.admin_append_variants(p_product_id uuid, p_variants jsonb) returns void
language plpgsql security definer set search_path = pg_catalog, store as $$
declare item jsonb; position_index integer; existing_count integer;
begin
 if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 200 then raise exception 'INVALID_VARIANTS'; end if;
 perform 1 from store.products where id=p_product_id for update;
 if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
 select count(*), coalesce(max(position), -1) + 1 into existing_count, position_index from store.variants where product_id=p_product_id;
 if existing_count + jsonb_array_length(p_variants) > 200 then raise exception 'INVALID_VARIANTS'; end if;
 for item in select value from jsonb_array_elements(p_variants) loop
  if nullif(trim(item->>'name'),'') is null or (item->>'price')::numeric <= 0 or (item->>'stock')::integer < 0 then raise exception 'INVALID_VARIANT'; end if;
  if exists(select 1 from store.variants where product_id=p_product_id and lower(trim(name))=lower(trim(item->>'name'))) then raise exception 'DUPLICATE_VARIANT'; end if;
  insert into store.variants(id,product_id,name,price,compare_at_price,stock,position)
  values ((item->>'id')::uuid,p_product_id,trim(item->>'name'),(item->>'price')::numeric,(item->>'compareAtPrice')::numeric,(item->>'stock')::integer,position_index);
  position_index := position_index + 1;
 end loop;
 if existing_count=0 and jsonb_array_length(p_variants)>0 then
  update store.products set option_name=coalesce(nullif(option_name,''),'Вид'), stock=null, updated_at=now() where id=p_product_id;
 end if;
end $$;
revoke all on function store.admin_append_variants(uuid,jsonb) from public,anon,authenticated;
grant execute on function store.admin_append_variants(uuid,jsonb) to tiarra_app;
