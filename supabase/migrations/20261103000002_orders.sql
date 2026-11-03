create table store.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  status text not null default 'new' check (status in ('new', 'confirmed', 'sent', 'completed', 'cancelled')),
  customer_name text not null,
  phone text not null,
  email text,
  courier text not null check (courier in ('econt', 'speedy')),
  delivery_address text not null,
  notes text not null default '',
  subtotal numeric(10, 2) not null,
  shipping numeric(10, 2) not null,
  total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table store.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store.orders (id) on delete cascade,
  product_id uuid references store.products (id) on delete set null,
  variant_id uuid references store.variants (id) on delete set null,
  title text not null,
  variant_name text,
  unit_price numeric(10, 2) not null,
  quantity int not null check (quantity between 1 and 99),
  line_total numeric(10, 2) not null
);

create index orders_created_at_idx on store.orders (created_at desc);
create index order_items_order_id_idx on store.order_items (order_id);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'tiarra_app') then
    grant select, insert on store.orders, store.order_items to tiarra_app;
    grant usage, select on sequence store.orders_order_number_seq to tiarra_app;
  end if;
end
$$;
