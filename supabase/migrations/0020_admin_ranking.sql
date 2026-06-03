-- =============================================================================
-- Admin Ranking RPCs
-- =============================================================================

-- RPC: get_admin_user_ranks
-- Returns monthly and alltime rank + points for every user that has any points.
-- Used by /admin/users to show "#5 mensal · #12 geral" per row.
create or replace function get_admin_user_ranks()
returns table (
  user_id        uuid,
  monthly_rank   bigint,
  alltime_rank   bigint,
  monthly_points bigint,
  alltime_points bigint
) language sql security definer stable as $$
  with monthly as (
    select
      up.user_id,
      sum(up.points) as pts,
      row_number() over (order by sum(up.points) desc) as rank
    from user_points up
    where date_trunc('month', up.created_at) = date_trunc('month', now())
    group by up.user_id
  ),
  alltime as (
    select
      up.user_id,
      sum(up.points) as pts,
      row_number() over (order by sum(up.points) desc) as rank
    from user_points up
    group by up.user_id
  ),
  all_users as (
    select user_id from monthly
    union
    select user_id from alltime
  )
  select
    au.user_id,
    m.rank as monthly_rank,
    a.rank as alltime_rank,
    coalesce(m.pts, 0) as monthly_points,
    coalesce(a.pts, 0) as alltime_points
  from all_users au
  left join monthly m on m.user_id = au.user_id
  left join alltime a on a.user_id = au.user_id;
$$;

-- RPC: get_admin_ranking
-- Full ranking for admin with optional filters by year/month and state/city.
-- Positions are recalculated AFTER filtering — when filtering by SP, #1 is the
-- best ranked within SP, not the overall #1 who happens to be from SP.
create or replace function get_admin_ranking(
  p_scope text  default 'alltime',
  p_year  int   default null,
  p_month int   default null,
  p_state text  default null,
  p_city  text  default null,
  p_limit int   default 5000
)
returns table (
  rank         bigint,
  user_id      uuid,
  full_name    text,
  email        text,
  whatsapp     text,
  state        text,
  city         text,
  plan         plan_id,
  total_points bigint
) language sql security definer stable as $$
  with filtered as (
    select
      up.user_id,
      sum(up.points) as total_points
    from user_points up
    join profiles p on p.id = up.user_id
    where
      (
        p_scope = 'alltime'
        or (
          p_scope = 'monthly'
          and extract(year  from up.created_at)::int = coalesce(p_year,  extract(year  from now())::int)
          and extract(month from up.created_at)::int = coalesce(p_month, extract(month from now())::int)
        )
      )
      and (coalesce(p_state, '') = '' or p.state = p_state)
      and (coalesce(p_city,  '') = '' or p.city  = p_city)
    group by up.user_id
  )
  select
    row_number() over (order by f.total_points desc) as rank,
    f.user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)) as full_name,
    p.email,
    p.whatsapp,
    p.state,
    p.city,
    coalesce(s.plan, 'free') as plan,
    f.total_points
  from filtered f
  join profiles p on p.id = f.user_id
  left join subscriptions s on s.user_id = f.user_id
  order by f.total_points desc
  limit p_limit;
$$;
