-- Tiarra storefront catalog and site content.
-- Read by the storefront through a direct Postgres connection (lib/db.ts);
-- the schema is not exposed through PostgREST.

create schema if not exists store;

create table store.categories (
  id uuid primary key default gen_random_uuid(),
  legacy_id int unique,
  slug text not null unique,
  name text not null,
  position int not null default 0
);

create table store.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id int unique,
  slug text not null unique,
  title text not null,
  brand text,
  gender text not null check (gender in ('female', 'male', 'unisex')),
  description_html text not null default '',
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  -- null = stock is not tracked (always available)
  stock int,
  option_name text,
  perfume jsonb,
  seo_title text,
  seo_description text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table store.product_categories (
  product_id uuid not null references store.products (id) on delete cascade,
  category_id uuid not null references store.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index product_categories_category_id_idx on store.product_categories (category_id);

create table store.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references store.products (id) on delete cascade,
  source_key text not null,
  path text not null,
  width int not null,
  height int not null,
  alt text not null default '',
  position int not null,
  unique (product_id, source_key)
);

create index product_images_product_id_position_idx on store.product_images (product_id, position);

create table store.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references store.products (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  stock int,
  sku text not null default '',
  image_path text,
  position int not null,
  unique (product_id, name)
);

create index variants_product_id_position_idx on store.variants (product_id, position);

create table store.pages (
  slug text primary key,
  title text not null,
  body_html text not null,
  seo_description text not null default '',
  updated_at timestamptz default now()
);

create table store.site_documents (
  key text primary key check (key in ('home', 'settings', 'navigation')),
  published jsonb not null,
  draft jsonb,
  updated_at timestamptz default now()
);

-- Product and site images are served straight from public storage URLs.
-- Guarded because the integration-test database (tiarra_test) is a plain Postgres database
-- without the Supabase storage schema; on a real Supabase project the bucket is always created.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('products', 'products', true)
    on conflict do nothing;
  end if;
end
$$;
