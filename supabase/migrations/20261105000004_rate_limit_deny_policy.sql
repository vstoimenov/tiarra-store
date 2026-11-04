-- Make the intentional direct-access denial explicit for the database linter.
create policy no_direct_access on store.checkout_rate_limits
  for all to public using (false) with check (false);
