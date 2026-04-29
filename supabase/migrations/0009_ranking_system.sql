-- =============================================================================
-- POPline Creators — Ranking & Gamification System
-- =============================================================================

-- Enum -----------------------------------------------------------------------

create type point_event_type as enum (
  'watch_lesson',
  'campaign_approved',
  'plan_signed',
  'daily_login'
);

-- Tables ---------------------------------------------------------------------

create table user_points (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  points       integer not null check (points > 0),
  event_type   point_event_type not null,
  reference_id uuid,
  -- Stores UTC calendar day; used for daily dedup (avoids non-immutable cast in functional index)
  event_date   date not null default current_date,
  created_at   timestamptz not null default now()
);

create table user_login_streaks (
  user_id          uuid primary key references profiles(id) on delete cascade,
  last_login_date  date not null default current_date,
  current_streak   integer not null default 1,
  updated_at       timestamptz not null default now()
);

-- Indexes --------------------------------------------------------------------

create index user_points_user_id_idx on user_points (user_id);
create index user_points_created_at_idx on user_points (created_at);

-- Idempotency: each lesson awards points only once per user
create unique index user_points_watch_unique
  on user_points (user_id, reference_id)
  where event_type = 'watch_lesson';

-- Idempotency: each campaign approval awards points only once per user
create unique index user_points_campaign_unique
  on user_points (user_id, reference_id)
  where event_type = 'campaign_approved';

-- Idempotency: one daily login point per user per calendar day
create unique index user_points_login_unique
  on user_points (user_id, event_date)
  where event_type = 'daily_login';

-- Idempotency: one plan sign point per user per calendar day
create unique index user_points_plan_unique
  on user_points (user_id, event_date)
  where event_type = 'plan_signed';

-- RLS ------------------------------------------------------------------------

alter table user_points enable row level security;
alter table user_login_streaks enable row level security;

-- Any authenticated user can read points (needed for public leaderboard)
create policy "Authenticated can read points"
  on user_points for select
  using (auth.role() = 'authenticated');

-- Users manage only their own streak row
create policy "Own login streak"
  on user_login_streaks for all
  using (auth.uid() = user_id);

-- =============================================================================
-- Trigger helpers (eligibility check)
-- =============================================================================

-- Returns true if user currently has an active semester or yearly plan
create or replace function is_ranking_eligible(p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from subscriptions
    where user_id = p_user_id
      and plan in ('semester', 'yearly')
      and (expires_at is null or expires_at > now())
  );
$$;

-- =============================================================================
-- Trigger 1: award points when a lesson is marked watched
-- =============================================================================

create or replace function trg_award_watch_lesson_points()
returns trigger language plpgsql security definer as $$
begin
  if is_ranking_eligible(new.user_id) then
    insert into user_points (user_id, points, event_type, reference_id, event_date)
    values (new.user_id, 10, 'watch_lesson', new.lesson_id, current_date)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger award_watch_lesson_points
  after insert on watched_lessons
  for each row execute function trg_award_watch_lesson_points();

-- =============================================================================
-- Trigger 2: award points when a campaign application is approved
-- =============================================================================

create or replace function trg_award_campaign_approved_points()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    if is_ranking_eligible(new.user_id) then
      insert into user_points (user_id, points, event_type, reference_id, event_date)
      values (new.user_id, 50, 'campaign_approved', new.campaign_id, current_date)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger award_campaign_approved_points
  after insert or update of status on applications
  for each row execute function trg_award_campaign_approved_points();

-- =============================================================================
-- Trigger 3: award points when a semester or yearly plan is activated/renewed
-- =============================================================================

create or replace function trg_award_plan_points()
returns trigger language plpgsql security definer as $$
declare
  v_points integer;
begin
  if new.plan not in ('semester', 'yearly') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.plan = new.plan and old.started_at = new.started_at then
    return new;
  end if;

  v_points := case new.plan when 'semester' then 20 when 'yearly' then 50 end;

  insert into user_points (user_id, points, event_type, reference_id, event_date)
  values (new.user_id, v_points, 'plan_signed', null, current_date)
  on conflict do nothing;

  return new;
end;
$$;

create trigger award_plan_points
  after insert or update of plan, started_at on subscriptions
  for each row execute function trg_award_plan_points();

-- =============================================================================
-- RPC: record_daily_login
-- Awards 1 point for the first login of each calendar day (eligible users only)
-- Also maintains the login streak table
-- =============================================================================

create or replace function record_daily_login()
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_today   date := current_date;
  v_streak  record;
begin
  if v_user_id is null then return; end if;

  if not is_ranking_eligible(v_user_id) then
    return;
  end if;

  -- Award 1 point (unique index on (user_id, event_date) prevents duplicates)
  insert into user_points (user_id, points, event_type, reference_id, event_date)
  values (v_user_id, 1, 'daily_login', null, v_today)
  on conflict do nothing;

  -- Maintain streak table
  select * into v_streak from user_login_streaks where user_id = v_user_id;

  if not found then
    insert into user_login_streaks (user_id, last_login_date, current_streak)
    values (v_user_id, v_today, 1);
  elsif v_streak.last_login_date = v_today then
    null;
  elsif v_streak.last_login_date = v_today - 1 then
    update user_login_streaks
    set last_login_date = v_today,
        current_streak  = current_streak + 1,
        updated_at      = now()
    where user_id = v_user_id;
  else
    update user_login_streaks
    set last_login_date = v_today,
        current_streak  = 1,
        updated_at      = now()
    where user_id = v_user_id;
  end if;
end;
$$;

-- =============================================================================
-- RPC: get_monthly_ranking
-- Top p_limit users by points in the current calendar month
-- =============================================================================

create or replace function get_monthly_ranking(p_limit int default 50)
returns table (
  rank         bigint,
  user_id      uuid,
  full_name    text,
  photo_url    text,
  plan         plan_id,
  total_points bigint
) language sql security definer stable as $$
  select
    row_number() over (order by sum(up.points) desc) as rank,
    up.user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)) as full_name,
    p.photo_url,
    coalesce(s.plan, 'free') as plan,
    sum(up.points) as total_points
  from user_points up
  join profiles p on p.id = up.user_id
  left join subscriptions s on s.user_id = up.user_id
  where date_trunc('month', up.created_at) = date_trunc('month', now())
  group by up.user_id, p.full_name, p.email, p.photo_url, s.plan
  order by total_points desc
  limit p_limit;
$$;

-- =============================================================================
-- RPC: get_alltime_ranking
-- Top p_limit users by total points of all time
-- =============================================================================

create or replace function get_alltime_ranking(p_limit int default 50)
returns table (
  rank         bigint,
  user_id      uuid,
  full_name    text,
  photo_url    text,
  plan         plan_id,
  total_points bigint
) language sql security definer stable as $$
  select
    row_number() over (order by sum(up.points) desc) as rank,
    up.user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)) as full_name,
    p.photo_url,
    coalesce(s.plan, 'free') as plan,
    sum(up.points) as total_points
  from user_points up
  join profiles p on p.id = up.user_id
  left join subscriptions s on s.user_id = up.user_id
  group by up.user_id, p.full_name, p.email, p.photo_url, s.plan
  order by total_points desc
  limit p_limit;
$$;

-- =============================================================================
-- RPC: get_user_ranking_stats
-- Returns the authenticated user's rank and points for both rankings
-- =============================================================================

create or replace function get_user_ranking_stats()
returns table (
  monthly_rank   bigint,
  monthly_points bigint,
  alltime_rank   bigint,
  alltime_points bigint
) language sql security definer stable as $$
  with monthly as (
    select
      up.user_id,
      row_number() over (order by sum(up.points) desc) as rank,
      sum(up.points) as pts
    from user_points up
    where date_trunc('month', up.created_at) = date_trunc('month', now())
    group by up.user_id
  ),
  alltime as (
    select
      up.user_id,
      row_number() over (order by sum(up.points) desc) as rank,
      sum(up.points) as pts
    from user_points up
    group by up.user_id
  )
  select
    m.rank         as monthly_rank,
    coalesce(m.pts, 0) as monthly_points,
    a.rank         as alltime_rank,
    coalesce(a.pts, 0) as alltime_points
  from (select auth.uid() as uid) me
  left join monthly m on m.user_id = me.uid
  left join alltime a on a.user_id = me.uid;
$$;
