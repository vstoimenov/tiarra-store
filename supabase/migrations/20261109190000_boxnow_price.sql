alter table store.commerce_settings add column box_now_price numeric(10,2) not null default 2.49 check (box_now_price between 0 and 100);
