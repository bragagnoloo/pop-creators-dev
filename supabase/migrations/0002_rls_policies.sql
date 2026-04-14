-- =============================================================================
-- Row Level Security — policies por tabela
-- =============================================================================

alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table applications enable row level security;
alter table campaign_deliveries enable row level security;
alter table balance_credits enable row level security;
alter table withdrawals enable row level security;
alter table subscriptions enable row level security;
alter table lessons enable row level security;
alter table lesson_ratings enable row level security;
alter table lesson_comments enable row level security;
alter table watched_lessons enable row level security;
alter table saved_scripts enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create policy "profiles: users read any authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: user updates own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin updates any"
  on profiles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- INSERT é feito pelo trigger handle_new_user (security definer), sem policy

-- -----------------------------------------------------------------------------
-- campaigns (todos autenticados leem; só admin escreve)
-- -----------------------------------------------------------------------------

create policy "campaigns: read authenticated"
  on campaigns for select
  to authenticated
  using (true);

create policy "campaigns: admin writes"
  on campaigns for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- applications
-- -----------------------------------------------------------------------------

create policy "applications: user reads own"
  on applications for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "applications: user creates own (pending)"
  on applications for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "applications: admin updates any"
  on applications for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "applications: admin deletes"
  on applications for delete
  to authenticated
  using (is_admin());

-- -----------------------------------------------------------------------------
-- campaign_deliveries
-- -----------------------------------------------------------------------------

create policy "deliveries: read own or admin"
  on campaign_deliveries for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "deliveries: user updates own content_url"
  on campaign_deliveries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "deliveries: admin full"
  on campaign_deliveries for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- balance_credits
-- -----------------------------------------------------------------------------

create policy "credits: user reads own"
  on balance_credits for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "credits: admin writes"
  on balance_credits for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- withdrawals
-- -----------------------------------------------------------------------------

create policy "withdrawals: user reads own"
  on withdrawals for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "withdrawals: user creates own requested"
  on withdrawals for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'requested');

create policy "withdrawals: admin updates"
  on withdrawals for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------

create policy "subscriptions: user reads own"
  on subscriptions for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "subscriptions: admin writes"
  on subscriptions for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- lessons
-- -----------------------------------------------------------------------------

create policy "lessons: read authenticated"
  on lessons for select
  to authenticated
  using (true);

create policy "lessons: admin writes"
  on lessons for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- lesson_ratings

create policy "ratings: read authenticated"
  on lesson_ratings for select
  to authenticated
  using (true);

create policy "ratings: upsert own"
  on lesson_ratings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- lesson_comments

create policy "comments: read authenticated"
  on lesson_comments for select
  to authenticated
  using (true);

create policy "comments: user creates own"
  on lesson_comments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "comments: user deletes own"
  on lesson_comments for delete
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- watched_lessons

create policy "watched: read own"
  on watched_lessons for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "watched: upsert own"
  on watched_lessons for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- saved_scripts (privado por usuário)
-- -----------------------------------------------------------------------------

create policy "scripts: user full on own"
  on saved_scripts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
