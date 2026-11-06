grant update (published, draft, updated_at) on store.site_documents to tiarra_app;
create policy tiarra_app_edit_home on store.site_documents for update to tiarra_app using (key = 'home') with check (key = 'home');
