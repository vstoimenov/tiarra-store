-- A narrow server-only operation for product creation and catalog associations.
-- The application role does not receive direct INSERT/DELETE on catalog tables.
create or replace function store.admin_save_product(p_data jsonb) returns table(id uuid, slug text, updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,store as $$
declare
  target uuid;
  current_slug text;
  item jsonb;
  category uuid;
  image_ids uuid[] := array[]::uuid[];
  image_id uuid;
  image_position int := 0;
begin
  if p_data ? 'id' then
    target := (p_data->>'id')::uuid;
    select p.slug into current_slug from store.products p where p.id=target for update;
    if current_slug is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
    update store.products p set
      title=p_data->>'title', brand=nullif(p_data->>'brand',''),
      gender=p_data->>'gender', price=(p_data->>'price')::numeric,
      compare_at_price=(p_data->>'compareAtPrice')::numeric,
      description_html=coalesce(p_data->>'descriptionHtml',''),
      perfume=case when p_data ? 'perfume' then nullif(p_data->'perfume', 'null'::jsonb) else p.perfume end,
      is_hidden=(p_data->>'hidden')::boolean,updated_at=now()
    where p.id=target;
  else
    current_slug := p_data->>'slug';
    insert into store.products(slug,title,brand,gender,price,compare_at_price,stock,description_html,is_hidden,perfume)
    values(current_slug,p_data->>'title',nullif(p_data->>'brand',''),p_data->>'gender',
      (p_data->>'price')::numeric,(p_data->>'compareAtPrice')::numeric,(p_data->>'stock')::int,
      coalesce(p_data->>'descriptionHtml',''),(p_data->>'hidden')::boolean,nullif(p_data->'perfume','null'::jsonb))
    returning store.products.id into target;
  end if;

  delete from store.product_categories pc where pc.product_id=target;
  for item in select value from jsonb_array_elements(p_data->'categoryIds') loop
    category := (item#>>'{}')::uuid;
    insert into store.product_categories(product_id,category_id) values(target,category);
  end loop;

  for item in select value from jsonb_array_elements(p_data->'images') loop
    image_id := nullif(item->>'id','')::uuid;
    if image_id is not null then
      update store.product_images pi set alt=coalesce(item->>'alt',''),position=image_position
      where pi.id=image_id and pi.product_id=target;
      if not found then raise exception 'IMAGE_NOT_FOUND'; end if;
      image_ids := array_append(image_ids,image_id);
    else
      insert into store.product_images(product_id,source_key,path,width,height,alt,position)
      values(target,'admin:'||gen_random_uuid()::text,item->>'path',
        (item->>'width')::int,(item->>'height')::int,coalesce(item->>'alt',''),image_position)
      returning store.product_images.id into image_id;
      image_ids := array_append(image_ids,image_id);
    end if;
    image_position := image_position+1;
  end loop;
  delete from store.product_images pi where pi.product_id=target and not (pi.id=any(image_ids));

  return query select p.id,p.slug,p.updated_at from store.products p where p.id=target;
end $$;
revoke all on function store.admin_save_product(jsonb) from public,anon,authenticated;
grant execute on function store.admin_save_product(jsonb) to tiarra_app;
