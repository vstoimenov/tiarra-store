create table store.checkout_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count int not null default 1 check (request_count > 0)
);
alter table store.checkout_rate_limits enable row level security;

create function store.check_checkout_rate_limit(p_key_hash text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, store
as $$
declare current_row store.checkout_rate_limits%rowtype;
begin
  if length(p_key_hash) <> 64 or p_limit < 1 or p_limit > 1000 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key_hash, 0));
  select * into current_row from store.checkout_rate_limits where key_hash = p_key_hash for update;
  if not found then
    insert into store.checkout_rate_limits (key_hash) values (p_key_hash);
    return true;
  end if;
  if current_row.window_started_at < now() - make_interval(secs => p_window_seconds) then
    update store.checkout_rate_limits set window_started_at = now(), request_count = 1 where key_hash = p_key_hash;
    return true;
  end if;
  if current_row.request_count >= p_limit then return false; end if;
  update store.checkout_rate_limits set request_count = request_count + 1 where key_hash = p_key_hash;
  return true;
end
$$;

revoke all on function store.check_checkout_rate_limit(text, int, int) from public;
grant execute on function store.check_checkout_rate_limit(text, int, int) to tiarra_app;
