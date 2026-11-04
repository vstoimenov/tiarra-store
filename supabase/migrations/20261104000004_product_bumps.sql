-- One owner-selected cross-sell product per catalog product.
-- Products without an explicit row use the storefront's category-aware fallback.
create table store.product_bumps (
  product_id uuid primary key references store.products (id) on delete cascade,
  bump_product_id uuid not null references store.products (id) on delete cascade,
  label text not null default 'Добави към ритуала си',
  updated_at timestamptz not null default now(),
  constraint product_bumps_distinct_products check (product_id <> bump_product_id)
);

create index product_bumps_bump_product_id_idx
  on store.product_bumps (bump_product_id);

comment on table store.product_bumps is
  'Owner-selected product-page cross-sells; absence means use the automatic fallback.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'tiarra_app') then
    grant select, insert, update, delete on store.product_bumps to tiarra_app;
  end if;
end
$$;
