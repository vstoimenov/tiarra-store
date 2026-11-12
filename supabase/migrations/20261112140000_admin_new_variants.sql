-- Adds variants to a newly created product inside the admin save transaction.
create function store.admin_add_new_variants(p_product_id uuid, p_variants jsonb) returns void
language plpgsql security definer set search_path = pg_catalog, store as $$
declare item jsonb; position_index integer := 0;
begin
 if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 100 then raise exception 'INVALID_VARIANTS'; end if;
 perform 1 from store.products where id=p_product_id for update;
 if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
 if exists(select 1 from store.variants where product_id=p_product_id) then raise exception 'VARIANTS_EXIST'; end if;
 for item in select value from jsonb_array_elements(p_variants) loop
  if nullif(trim(item->>'name'),'') is null or (item->>'price')::numeric <= 0 or (item->>'stock')::integer < 0 then raise exception 'INVALID_VARIANT'; end if;
  insert into store.variants(id,product_id,name,price,compare_at_price,stock,position)
  values ((item->>'id')::uuid,p_product_id,trim(item->>'name'),(item->>'price')::numeric,(item->>'compareAtPrice')::numeric,(item->>'stock')::integer,position_index);
  position_index := position_index+1;
 end loop;
 update store.products set option_name='Вид', stock=null, updated_at=now() where id=p_product_id;
end $$;
revoke all on function store.admin_add_new_variants(uuid,jsonb) from public,anon,authenticated;
grant execute on function store.admin_add_new_variants(uuid,jsonb) to tiarra_app;
