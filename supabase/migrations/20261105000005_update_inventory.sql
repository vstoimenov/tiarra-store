create function store.update_inventory(p_id uuid, p_kind text, p_stock int)
returns table (slug text)
language plpgsql
security definer
set search_path = pg_catalog, store
as $$
begin
  if p_kind not in ('product','variant') or (p_stock is not null and (p_stock < 0 or p_stock > 99999)) then raise exception 'INVALID_INVENTORY'; end if;
  if p_kind = 'product' then
    return query update store.products p set stock=p_stock, updated_at=now() where p.id=p_id and not exists(select 1 from store.variants v where v.product_id=p.id) returning p.slug;
  else
    return query update store.variants v set stock=p_stock from store.products p where v.id=p_id and p.id=v.product_id returning p.slug;
  end if;
end
$$;
revoke all on function store.update_inventory(uuid,text,int) from public;
grant execute on function store.update_inventory(uuid,text,int) to tiarra_app;
