-- =============================================================================
-- Ranking — plano real no badge
-- =============================================================================
-- Problema: quem fica fora do top 50 tinha a própria linha montada no client
-- com plan/full_name/photo_url chumbados ('free', prefixo do email, sem foto).
-- Assinante anual aparecia como "Gratuito" pra si mesmo.
--
-- Correção: get_user_ranking_stats passa a devolver identidade e plano vigente
-- do usuário autenticado, na mesma chamada que já traz rank e pontos.
--
-- Bônus: as RPCs do top 50 passam a respeitar expires_at (antes mostravam o
-- plano cru da subscription, então uma assinatura vencida seguia exibindo
-- "Anual"). Regra alinhada com getPlansForUsers() em src/services/subscriptions.ts.
-- =============================================================================

-- Plano vigente: null ou vencido => 'free'
create or replace function current_plan_of(p_plan plan_id, p_expires_at timestamptz)
returns plan_id language sql stable as $$
  select case
    when p_plan is null then 'free'::plan_id
    when p_expires_at is not null and p_expires_at < now() then 'free'::plan_id
    else p_plan
  end;
$$;

-- =============================================================================
-- get_user_ranking_stats — agora com full_name, photo_url e plan
-- =============================================================================
-- Return type muda, então precisa dropar antes (Postgres não permite alterar
-- a assinatura de saída via create or replace).

drop function if exists get_user_ranking_stats();

create or replace function get_user_ranking_stats()
returns table (
  monthly_rank   bigint,
  monthly_points bigint,
  alltime_rank   bigint,
  alltime_points bigint,
  full_name      text,
  photo_url      text,
  plan           plan_id
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
    m.rank             as monthly_rank,
    coalesce(m.pts, 0) as monthly_points,
    a.rank             as alltime_rank,
    coalesce(a.pts, 0) as alltime_points,
    coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)) as full_name,
    p.photo_url,
    current_plan_of(s.plan, s.expires_at) as plan
  from (select auth.uid() as uid) me
  left join monthly m       on m.user_id = me.uid
  left join alltime a       on a.user_id = me.uid
  left join profiles p      on p.id      = me.uid
  left join subscriptions s on s.user_id = me.uid;
$$;

-- =============================================================================
-- Top 50 — plano vigente em vez do plano cru da subscription
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
    current_plan_of(s.plan, s.expires_at) as plan,
    sum(up.points) as total_points
  from user_points up
  join profiles p on p.id = up.user_id
  left join subscriptions s on s.user_id = up.user_id
  where date_trunc('month', up.created_at) = date_trunc('month', now())
  group by up.user_id, p.full_name, p.email, p.photo_url, s.plan, s.expires_at
  order by total_points desc
  limit p_limit;
$$;

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
    current_plan_of(s.plan, s.expires_at) as plan,
    sum(up.points) as total_points
  from user_points up
  join profiles p on p.id = up.user_id
  left join subscriptions s on s.user_id = up.user_id
  group by up.user_id, p.full_name, p.email, p.photo_url, s.plan, s.expires_at
  order by total_points desc
  limit p_limit;
$$;
