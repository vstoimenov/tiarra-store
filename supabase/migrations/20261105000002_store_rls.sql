-- Supabase Data API roles receive no policies. The private server role keeps only the
-- operations already granted to it, while RLS blocks accidental future exposure.
alter table store.categories enable row level security;
alter table store.products enable row level security;
alter table store.product_categories enable row level security;
alter table store.product_images enable row level security;
alter table store.variants enable row level security;
alter table store.pages enable row level security;
alter table store.site_documents enable row level security;
alter table store.orders enable row level security;
alter table store.order_items enable row level security;
alter table store.product_bumps enable row level security;

create policy tiarra_app_read on store.categories for select to tiarra_app using (true);
create policy tiarra_app_read on store.products for select to tiarra_app using (true);
create policy tiarra_app_read on store.product_categories for select to tiarra_app using (true);
create policy tiarra_app_read on store.product_images for select to tiarra_app using (true);
create policy tiarra_app_read on store.variants for select to tiarra_app using (true);
create policy tiarra_app_read on store.pages for select to tiarra_app using (true);
create policy tiarra_app_read on store.site_documents for select to tiarra_app using (true);
create policy tiarra_app_orders on store.orders for all to tiarra_app using (true) with check (true);
create policy tiarra_app_order_items on store.order_items for select to tiarra_app using (true);
create policy tiarra_app_bumps on store.product_bumps for all to tiarra_app using (true) with check (true);
