alter table store.orders add column ordyx_sync_status text not null default 'pending'
  check (ordyx_sync_status in ('pending','synced','failed'));
alter table store.orders add column ordyx_sync_error text;
alter table store.orders add column ordyx_synced_at timestamptz;
grant update on store.orders to tiarra_app;
