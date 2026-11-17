-- Server-only push credentials and device subscriptions; never exposed through PostgREST.
-- Keys are generated securely by the application on first activation, not stored in source.
create table if not exists store.admin_push_config (
 singleton boolean primary key default true check(singleton),
 public_key text not null,
 private_key text not null
);
create table if not exists store.admin_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists store.admin_push_queue (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references store.orders(id) on delete cascade,
 subscription_id uuid not null references store.admin_push_subscriptions(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','failed','sent','skipped')),
 attempts int not null default 0,
 next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(order_id,subscription_id)
);
create index if not exists admin_push_due on store.admin_push_queue(next_attempt_at) where status in ('pending','failed');
alter table store.admin_push_config enable row level security;
alter table store.admin_push_subscriptions enable row level security;
alter table store.admin_push_queue enable row level security;
revoke all on store.admin_push_config,store.admin_push_subscriptions,store.admin_push_queue from public,anon,authenticated;
grant select,insert on store.admin_push_config to tiarra_app;
grant select,insert,update,delete on store.admin_push_subscriptions,store.admin_push_queue to tiarra_app;
drop policy if exists admin_push_config_app on store.admin_push_config;
create policy admin_push_config_app on store.admin_push_config for all to tiarra_app using(true) with check(true);
drop policy if exists admin_push_subscriptions_app on store.admin_push_subscriptions;
create policy admin_push_subscriptions_app on store.admin_push_subscriptions for all to tiarra_app using(true) with check(true);
drop policy if exists admin_push_queue_app on store.admin_push_queue;
create policy admin_push_queue_app on store.admin_push_queue for all to tiarra_app using(true) with check(true);

-- Every successfully committed new order queues exactly one notification per subscribed device.
-- Retried checkout requests return an existing order, so do not run this trigger again.
create or replace function store.queue_admin_order_push() returns trigger
language plpgsql security definer set search_path=pg_catalog,store as $$
begin
 if new.status in ('new','confirmed') then
  insert into store.admin_push_queue(order_id,subscription_id)
   select new.id,s.id from store.admin_push_subscriptions s on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function store.queue_admin_order_push() from public,anon,authenticated;
drop trigger if exists admin_order_push on store.orders;
create trigger admin_order_push after insert on store.orders for each row execute function store.queue_admin_order_push();
