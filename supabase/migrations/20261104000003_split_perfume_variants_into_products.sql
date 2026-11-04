-- Present every perfume aroma as a standalone storefront product.
--
-- The old grouped products and their variants are intentionally retained and
-- hidden. This keeps the change reversible and preserves historical order
-- references. A variant UUID is reused as its standalone product UUID, which
-- makes this migration deterministic without an extra mapping table.

with perfume_variants as materialized (
  select
    p.*,
    v.id as variant_id,
    v.name as variant_name,
    v.price as variant_price,
    v.compare_at_price as variant_compare_at_price,
    v.stock as variant_stock,
    v.image_path as variant_image_path,
    v.position as variant_position,
    regexp_replace(v.name, '\s+[-–]\s+.*$', '') as short_variant_name
  from store.products p
  join store.product_categories pc on pc.product_id = p.id
  join store.categories c on c.id = pc.category_id and c.slug = 'parfimes'
  join store.variants v on v.product_id = p.id
  where not p.is_hidden
)
insert into store.products (
  id,
  legacy_id,
  slug,
  title,
  brand,
  gender,
  description_html,
  price,
  compare_at_price,
  stock,
  option_name,
  perfume,
  seo_title,
  seo_description,
  is_hidden,
  created_at,
  updated_at
)
select
  variant_id,
  null,
  regexp_replace(left(slug, 70), '-+$', '') || '-' ||
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(short_variant_name), '[^a-z0-9]+', '-', 'g')), ''),
      'aromat'
    ) || '-' || left(replace(variant_id::text, '-', ''), 8),
  title || ' — ' || short_variant_name,
  brand,
  gender,
  '<p><strong>Аромат:</strong> ' ||
    replace(replace(replace(variant_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') ||
    '</p>' || description_html,
  variant_price,
  variant_compare_at_price,
  variant_stock,
  null,
  coalesce(perfume, '{}'::jsonb) || jsonb_build_object('variant', variant_name),
  title || ' — ' || short_variant_name,
  coalesce(
    nullif(seo_description, ''),
    title || ' — ' || variant_name || '. Поръчайте онлайн от Tiarra Cosmetics.'
  ),
  false,
  created_at + variant_position * interval '1 millisecond',
  now()
from perfume_variants
on conflict (id) do nothing;

-- Copy every category from the grouped parent so filters and navigation stay
-- identical for the new standalone products.
insert into store.product_categories (product_id, category_id)
select v.id, pc.category_id
from store.variants v
join store.products parent on parent.id = v.product_id
join store.product_categories perfume_pc on perfume_pc.product_id = parent.id
join store.categories perfume_category
  on perfume_category.id = perfume_pc.category_id
  and perfume_category.slug = 'parfimes'
join store.product_categories pc on pc.product_id = parent.id
join store.products standalone on standalone.id = v.id
where not parent.is_hidden
on conflict do nothing;

-- Each source variant already has its own image. Preserve dimensions when the
-- same path exists in the parent's gallery, otherwise use the first gallery
-- image dimensions as the closest available metadata.
insert into store.product_images (
  product_id,
  source_key,
  path,
  width,
  height,
  alt,
  position
)
select
  v.id,
  'variant-image',
  v.image_path,
  coalesce(matching_image.width, first_image.width, 1200),
  coalesce(matching_image.height, first_image.height, 1200),
  standalone.title,
  0
from store.variants v
join store.products parent on parent.id = v.product_id
join store.product_categories pc on pc.product_id = parent.id
join store.categories c on c.id = pc.category_id and c.slug = 'parfimes'
join store.products standalone on standalone.id = v.id
left join lateral (
  select i.width, i.height
  from store.product_images i
  where i.product_id = parent.id and i.path = v.image_path
  order by i.position
  limit 1
) matching_image on true
left join lateral (
  select i.width, i.height
  from store.product_images i
  where i.product_id = parent.id
  order by i.position
  limit 1
) first_image on true
where not parent.is_hidden and nullif(v.image_path, '') is not null
on conflict (product_id, source_key) do nothing;

-- Hide the nine grouped products only after all standalone products, category
-- links and images have been created successfully in this transaction.
update store.products parent
set is_hidden = true, updated_at = now()
where not parent.is_hidden
  and exists (
    select 1
    from store.product_categories pc
    join store.categories c on c.id = pc.category_id and c.slug = 'parfimes'
    where pc.product_id = parent.id
  )
  and exists (select 1 from store.variants v where v.product_id = parent.id)
  and not exists (
    select 1
    from store.variants v
    left join store.products standalone on standalone.id = v.id
    left join store.product_images image
      on image.product_id = standalone.id and image.source_key = 'variant-image'
    where v.product_id = parent.id
      and (standalone.id is null or image.id is null)
  );
