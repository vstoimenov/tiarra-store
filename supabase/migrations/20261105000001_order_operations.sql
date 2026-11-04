-- Operational fields used by the protected order administration screen.
alter table store.orders
  add column internal_notes text not null default '',
  add column tracking_number text,
  add column tracking_url text,
  add column updated_at timestamptz not null default now();

create index orders_status_created_at_idx on store.orders (status, created_at desc);
