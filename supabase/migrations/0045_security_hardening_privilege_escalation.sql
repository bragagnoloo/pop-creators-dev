-- =============================================================================
-- 0045 — Blindagem contra escalada de privilégio e fraude de saldo
-- =============================================================================
--
-- Incidente (2026-10-10 → 2026-10-13): contas criadas pelo cadastro público
-- (hellohellotortas@proton.me, paquerador@proton.me, thiagkim@popline.com) se
-- auto-promoveram a 'admin' com um PATCH direto em /rest/v1/profiles usando a
-- anon key + o próprio JWT. A policy "profiles: user updates own" liberava
-- QUALQUER coluna da própria linha, inclusive role. Como admin, inseriram
-- balance_credits já 'available' (R$ 500 em campanha sem inscrição), aprovaram
-- inscrições, liberaram saldo e deram plano semestral grátis para um laranja
-- (miguelsiqueira0two@gmail.com), que pediu saque minutos depois.
--
-- Camadas desta migration:
--   1. profiles: campos de privilégio só mudam via service role ou admin master.
--   2. withdrawals: fim do INSERT direto pelo cliente (só via request_withdrawal).
--   3. balance_credits: gerar saldo exige inscrição aprovada, valor = cachê e
--      status 'processing'; pelo cliente só existe a transição processing →
--      available. Consumo/estorno continuam via funções SECURITY DEFINER.
--   4. RPCs SECURITY DEFINER que vazavam dados ou aceitavam user_id arbitrário.
--   5. Auditoria de mudanças sensíveis em profiles, withdrawals e subscriptions.
--
-- Sobre `current_user` nos guards: os triggers são SECURITY INVOKER de propósito.
-- Vindo do PostgREST com JWT de usuário, current_user = 'authenticated'. Dentro
-- de uma função SECURITY DEFINER (request_withdrawal, flag_withdrawal...) ou do
-- service role, current_user é o dono/service_role — e esses caminhos são
-- confiáveis. Por isso o guard só age quando current_user é anon/authenticated.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles — campos de privilégio
-- -----------------------------------------------------------------------------

create or replace function a_guard_profile_privileged_fields()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Admin master pode mexer em perfis alheios (policy "admin updates any"),
  -- mas nunca no próprio role — evita que um admin comprometido se blinde.
  if is_admin() and new.id <> auth.uid() then
    return new;
  end if;

  if new.role                   is distinct from old.role
  or new.extra_admin_tabs       is distinct from old.extra_admin_tabs
  or new.email                  is distinct from old.email
  or new.kiwify_subscription_id is distinct from old.kiwify_subscription_id
  or new.first_subscribed_at    is distinct from old.first_subscribed_at
  or new.first_utm_source       is distinct from old.first_utm_source
  or new.first_utm_campaign     is distinct from old.first_utm_campaign
  or new.created_at             is distinct from old.created_at
  or new.id                     is distinct from old.id then
    raise exception 'Alteração de campo protegido do perfil não permitida.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists a_guard_profile_privileged_fields on profiles;
create trigger a_guard_profile_privileged_fields
  before update on profiles
  for each row execute function a_guard_profile_privileged_fields();

revoke all on function a_guard_profile_privileged_fields() from public;

-- Ninguém insere perfil pelo cliente (handle_new_user faz isso no signup).
revoke insert, delete on profiles from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. withdrawals — só via request_withdrawal
-- -----------------------------------------------------------------------------
-- A policy permitia inserir um saque 'requested' com qualquer valor e sem
-- consumir crédito nenhum — o admin veria um pedido "normal" na fila.

drop policy if exists "withdrawals: user creates own requested" on withdrawals;
revoke insert, delete on withdrawals from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. balance_credits — gerar/liberar saldo
-- -----------------------------------------------------------------------------

create or replace function a_guard_credit_integrity()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_cache numeric;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'processing'
       or coalesce(new.consumed_amount, 0) <> 0
       or new.released_at is not null then
      raise exception 'Saldo deve ser gerado como "em processamento".'
        using errcode = 'check_violation';
    end if;

    if not exists (
      select 1 from applications a
       where a.campaign_id = new.campaign_id
         and a.user_id = new.user_id
         and a.status = 'approved'
    ) then
      raise exception 'Só é possível gerar saldo para inscrição aprovada na campanha.'
        using errcode = 'check_violation';
    end if;

    select cache into v_cache from campaigns where id = new.campaign_id;
    if v_cache is null or new.amount <> v_cache then
      raise exception 'Valor do saldo diferente do cachê da campanha.'
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  -- UPDATE pelo cliente: só "liberar" (processing → available), sem mexer em
  -- valor, dono, campanha ou consumo.
  if new.amount          is distinct from old.amount
  or new.user_id         is distinct from old.user_id
  or new.campaign_id     is distinct from old.campaign_id
  or new.consumed_amount is distinct from old.consumed_amount
  or new.created_at      is distinct from old.created_at
  or not (old.status = 'processing' and new.status = 'available') then
    raise exception 'Alteração de saldo não permitida.'
      using errcode = 'insufficient_privilege';
  end if;

  -- released_at é carimbado pelo banco, não pelo cliente.
  new.released_at := now();
  return new;
end;
$$;

drop trigger if exists a_guard_credit_integrity on balance_credits;
create trigger a_guard_credit_integrity
  before insert or update on balance_credits
  for each row execute function a_guard_credit_integrity();

revoke all on function a_guard_credit_integrity() from public;

-- -----------------------------------------------------------------------------
-- 4. RPCs SECURITY DEFINER expostas demais
-- -----------------------------------------------------------------------------

-- Só o servidor (service role) usa: lib/rate-limit.ts, lib/ai-quota.ts,
-- api/admin/ranking. Abertas, permitiam travar o rate limit de outra pessoa,
-- queimar a cota de IA alheia e listar email/WhatsApp de toda a base.
revoke execute on function check_rate_limit(text, integer, bigint) from public, anon, authenticated;
revoke execute on function gc_rate_limits() from public, anon, authenticated;
revoke execute on function record_ai_call(uuid) from public, anon, authenticated;
revoke execute on function get_admin_ranking(text, integer, integer, text, text, integer) from public, anon, authenticated;

grant execute on function check_rate_limit(text, integer, bigint) to service_role;
grant execute on function gc_rate_limits() to service_role;
grant execute on function record_ai_call(uuid) to service_role;
grant execute on function get_admin_ranking(text, integer, integer, text, text, integer) to service_role;

-- Chamada com o JWT do usuário (lib/ai-quota.ts): só a própria cota.
create or replace function get_ai_usage_current_month(p_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select calls from ai_usage
     where user_id = p_user_id
       and year_month = to_char(now(), 'YYYY-MM')
       and (p_user_id = auth.uid() or auth.uid() is null or is_admin())),
    0
  );
$$;
revoke execute on function get_ai_usage_current_month(uuid) from public, anon;

-- Chamada pelo painel admin com JWT do admin (services/ranking.ts).
create or replace function get_admin_user_ranks()
returns table(user_id uuid, monthly_rank bigint, alltime_rank bigint, monthly_points bigint, alltime_points bigint)
language sql stable security definer set search_path = public as $$
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
  left join alltime a on a.user_id = au.user_id
  where is_any_admin();
$$;
revoke execute on function get_admin_user_ranks() from public, anon;

-- -----------------------------------------------------------------------------
-- 5. Auditoria
-- -----------------------------------------------------------------------------
-- profiles: só quando muda algo sensível (evita ruído de meta params etc.).

drop trigger if exists audit_profiles_sensitive on profiles;
create trigger audit_profiles_sensitive
  after update on profiles
  for each row
  when (
       old.role             is distinct from new.role
    or old.extra_admin_tabs is distinct from new.extra_admin_tabs
    or old.pix_key          is distinct from new.pix_key
    or old.pix_key_type     is distinct from new.pix_key_type
    or old.pix_holder_name  is distinct from new.pix_holder_name
    or old.full_name        is distinct from new.full_name
  )
  execute function audit_row_change();

drop trigger if exists audit_withdrawals on withdrawals;
create trigger audit_withdrawals
  after insert or update or delete on withdrawals
  for each row execute function audit_row_change();

-- subscriptions não tem coluna id; audit_row_change lê ->>'id', então usamos
-- um wrapper que grava user_id como record_id.
create or replace function audit_subscription_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
begin
  insert into audit_log (table_name, record_id, action, actor_id, before, after)
  values (
    tg_table_name,
    (coalesce(v_new, v_old) ->> 'user_id')::uuid,
    tg_op,
    auth.uid(),
    v_old,
    v_new
  );
  return null;
end;
$$;
revoke all on function audit_subscription_change() from public;

drop trigger if exists audit_subscriptions on subscriptions;
create trigger audit_subscriptions
  after update on subscriptions
  for each row
  when (
       old.plan       is distinct from new.plan
    or old.expires_at is distinct from new.expires_at
  )
  execute function audit_subscription_change();

notify pgrst, 'reload schema';
