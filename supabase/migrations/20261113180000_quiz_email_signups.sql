-- Voluntary marketing signups from the perfume quiz. No public database access.
create table if not exists store.quiz_email_signups (
  email text primary key check (length(email) between 3 and 254),
  consent_version text not null,
  created_at timestamptz not null default now()
);
alter table store.quiz_email_signups enable row level security;
revoke all on store.quiz_email_signups from public, anon, authenticated;
grant select, insert, delete on store.quiz_email_signups to tiarra_app;
drop policy if exists quiz_email_signups_app on store.quiz_email_signups;
create policy quiz_email_signups_app on store.quiz_email_signups for all to tiarra_app using (true) with check (true);
