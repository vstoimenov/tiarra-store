-- Only explicitly consented future purchases enter this queue through the server.
-- Tokens are environment variables, never database fields or browser settings.
create table if not exists store.meta_conversion_queue (
 order_id uuid primary key references store.orders(id) on delete cascade,
 pixel_id text not null check(pixel_id ~ '^[0-9]{5,25}$'),
 payload jsonb,
 test_event_code text,
 status text not null default 'pending' check(status in ('pending','failed','sent','skipped')),
 attempts integer not null default 0 check(attempts>=0),
 next_attempt_at timestamptz default now(),
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
create index if not exists meta_conversion_retry_idx on store.meta_conversion_queue(next_attempt_at)
 where status in ('pending','failed');
alter table store.meta_conversion_queue enable row level security;
revoke all on store.meta_conversion_queue from public,anon,authenticated;
grant select,insert,update,delete on store.meta_conversion_queue to tiarra_app;
drop policy if exists meta_conversion_app on store.meta_conversion_queue;
create policy meta_conversion_app on store.meta_conversion_queue for all to tiarra_app using(true) with check(true);
