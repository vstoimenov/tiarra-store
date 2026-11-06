-- Server-only role: catalogue edits are protected by the authenticated admin routes.
grant update(title,brand,price,compare_at_price,is_hidden,updated_at) on store.products to tiarra_app;
grant update(name,price,compare_at_price) on store.variants to tiarra_app;
create policy tiarra_app_product_edit on store.products for update to tiarra_app using(true) with check(true);
create policy tiarra_app_variant_edit on store.variants for update to tiarra_app using(true) with check(true);
