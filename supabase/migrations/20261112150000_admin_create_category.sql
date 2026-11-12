create function store.admin_create_category(p_name text, p_slug text) returns table(id uuid, name text)
language plpgsql security definer set search_path = pg_catalog, store as $$
begin
 if length(trim(p_name)) not between 2 and 100 or length(trim(p_slug)) not between 1 and 80 then raise exception 'INVALID_CATEGORY'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_name)), 0));
 if exists(select 1 from store.categories c where lower(trim(c.name)) = lower(trim(p_name)) or c.slug=p_slug) then raise exception 'CATEGORY_EXISTS'; end if;
 return query insert into store.categories(name,slug) values(trim(p_name),p_slug) returning store.categories.id,store.categories.name;
end $$;
revoke all on function store.admin_create_category(text,text) from public,anon,authenticated;
grant execute on function store.admin_create_category(text,text) to tiarra_app;
