-- Set images only for variants belonging to the locked product.
create or replace function store.admin_set_variant_images(p_product_id uuid, p_variants jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,store as $$
declare item jsonb; current_path text; next_path text;
begin
 if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants)>200 then raise exception 'INVALID_VARIANTS'; end if;
 perform 1 from store.products where id=p_product_id for update;
 if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
 for item in select value from jsonb_array_elements(p_variants) loop
  if not (item ? 'imagePath') then continue; end if;
  select image_path into current_path from store.variants where id=(item->>'id')::uuid and product_id=p_product_id for update;
  if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
  next_path := nullif(item->>'imagePath','');
  if next_path is not null and next_path is distinct from current_path and not exists (
   select 1 from store.product_images where product_id=p_product_id and path=next_path
  ) then raise exception 'IMAGE_NOT_FOUND'; end if;
  update store.variants set image_path=next_path where id=(item->>'id')::uuid and product_id=p_product_id;
 end loop;
end $$;
revoke all on function store.admin_set_variant_images(uuid,jsonb) from public,anon,authenticated;
grant execute on function store.admin_set_variant_images(uuid,jsonb) to tiarra_app;
