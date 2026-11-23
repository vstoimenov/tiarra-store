-- Previously provisioned manually; include it when rebuilding a fresh database.
create table if not exists store.order_email_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store.orders(id) on delete cascade,
  kind text not null check (kind in ('customer', 'merchant')),
  status text not null default 'pending' check (status in ('pending', 'failed', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, kind)
);
create index if not exists order_email_queue_retry_idx
  on store.order_email_queue(created_at) where status in ('pending', 'failed');
alter table store.order_email_queue enable row level security;
grant usage on schema store to tiarra_app;
revoke all on store.order_email_queue from public, anon, authenticated;
grant select, insert, update, delete on store.order_email_queue to tiarra_app;
drop policy if exists order_email_queue_app on store.order_email_queue;
create policy order_email_queue_app on store.order_email_queue for all to tiarra_app using (true) with check (true);
