-- =============================================================================
-- 0033 — B2B: remove "último pagamento" e expõe o saldo pendente a gerar
-- =============================================================================
--
-- Ajustes na aba /admin/b2b depois do primeiro uso real:
--
--   1. Remove campaign_finance.company_last_payment_at — campo puramente
--      informativo, que não entrava em nenhum cálculo e na prática não era
--      usado (0 de 17 linhas preenchidas quando foi removido).
--
--   2. Acrescenta pending_to_generate na view: quanto de cachê ainda falta
--      creditar em campanhas JÁ CONCLUÍDAS. É o cruzamento "campanha acabou mas
--      o creator não recebeu nada" — vira big number na aba e alimenta o
--      termômetro de risco.
--
-- Nada além da aba B2B é tocado. A view precisa ser recriada porque depende da
-- coluna removida.
-- =============================================================================

drop view if exists b2b_finance_overview;

alter table campaign_finance
  drop column if exists company_last_payment_at;

create view b2b_finance_overview
with (security_invoker = on)
as
with participation as (
  -- "Apto para pagamento" = aprovado e ainda não desclassificado.
  select
    a.campaign_id,
    count(*)::int as eligible_participants
  from applications a
  where a.status = 'approved'
    and a.disqualified_at is null
  group by a.campaign_id
),
credit_rollup as (
  select
    bc.campaign_id,
    coalesce(sum(bc.amount), 0)::numeric(14, 2) as credited_total,
    coalesce(sum(bc.amount) filter (where bc.status = 'processing'), 0)::numeric(14, 2)
      as processing_total,
    coalesce(sum(greatest(bc.amount - bc.consumed_amount, 0))
             filter (where bc.status = 'available'), 0)::numeric(14, 2)
      as wallet_total
  from balance_credits bc
  group by bc.campaign_id
),
paid_rollup as (
  -- w.status = 'paid' é obrigatório: flag_withdrawal() estorna os créditos mas
  -- NÃO limpa consumed_credits.
  select
    bc.campaign_id,
    coalesce(sum((item->>'amount')::numeric), 0)::numeric(14, 2) as paid_total
  from withdrawals w
  cross join lateral jsonb_array_elements(w.consumed_credits) as item
  join balance_credits bc on bc.id = (item->>'creditId')::uuid
  where w.status = 'paid'
    and jsonb_typeof(w.consumed_credits) = 'array'
  group by bc.campaign_id
),
last_stage as (
  -- max(completed_at): a etapa 8 nunca recebe completed_at (complete_stage
  -- recusa quando current_stage >= 8), e revert_stage limpa a etapa revertida.
  select campaign_id, max(completed_at) as last_completed_at
  from campaign_stage_schedule
  where completed_at is not null
  group by campaign_id
),
base as (
  select
    c.id     as campaign_id,
    c.title,
    c.status as campaign_status,
    c.current_stage,
    c.delivery_count,
    case
      when c.is_review then 'review'
      when c.is_invite then 'invite'
      else 'standard'
    end as campaign_type,
    c.has_cache,
    (case when c.has_cache then c.cache else 0 end)::numeric(12, 2) as cache,

    (c.created_at at time zone 'America/Sao_Paulo')::date as opened_on,

    f.paying_company,
    f.agreed_value,
    f.agreed_payment_due_date,
    f.company_payment_estimate,
    coalesce(f.company_payment_status, 'pendente'::b2b_payment_status) as company_payment_status,
    coalesce(f.company_paid_value, 0)::numeric(12, 2)                  as company_paid_value,
    coalesce(f.tax_rate, 0)::numeric(5, 2)                             as tax_rate,
    f.closed_at_override,
    coalesce(f.finance_status, 'em_aberto'::b2b_finance_status)        as finance_status,
    f.notes,
    f.updated_at as finance_updated_at,

    case
      when f.closed_at_override is not null then f.closed_at_override
      when c.status <> 'completed' then null
      when ls.last_completed_at is not null
        then (ls.last_completed_at at time zone 'America/Sao_Paulo')::date
      when c.stage_updated_at is not null
        then (c.stage_updated_at at time zone 'America/Sao_Paulo')::date
      else null
    end as closed_on,
    case
      when f.closed_at_override is not null then 'override'
      when c.status <> 'completed' then null
      when ls.last_completed_at is not null then 'stage'
      when c.stage_updated_at is not null then 'status'
      else null
    end as closed_source,

    coalesce(p.eligible_participants, 0)             as eligible_participants,
    coalesce(cr.credited_total, 0)::numeric(14, 2)   as credited_total,
    coalesce(cr.processing_total, 0)::numeric(14, 2) as processing_total,
    coalesce(cr.wallet_total, 0)::numeric(14, 2)     as wallet_total,
    coalesce(pr.paid_total, 0)::numeric(14, 2)       as paid_total
  from campaigns c
  left join campaign_finance f on f.campaign_id = c.id
  left join participation    p on p.campaign_id = c.id
  left join credit_rollup   cr on cr.campaign_id = c.id
  left join paid_rollup     pr on pr.campaign_id = c.id
  left join last_stage      ls on ls.campaign_id = c.id
),
calc as (
  select
    b.*,
    (now() at time zone 'America/Sao_Paulo')::date            as today_br,
    (b.eligible_participants * b.cache)::numeric(14, 2)       as total_due_creators,
    case
      when b.agreed_value is null then null
      else (b.agreed_value * (1 - b.tax_rate / 100))::numeric(14, 2)
    end                                                       as net_revenue,
    greatest(coalesce(b.agreed_value, 0) - b.company_paid_value, 0)::numeric(14, 2)
                                                              as company_outstanding
  from base b
)
select
  c.campaign_id,
  c.title,
  c.campaign_status,
  c.current_stage,
  c.delivery_count,
  c.campaign_type,
  c.has_cache,
  c.cache,
  c.opened_on,
  c.closed_on,
  c.closed_source,

  c.paying_company,
  c.agreed_value,
  c.agreed_payment_due_date,
  c.company_payment_estimate,
  c.company_payment_status,
  c.company_paid_value,
  c.tax_rate,
  c.closed_at_override,
  c.finance_status,
  c.notes,
  c.finance_updated_at,

  c.eligible_participants,
  c.credited_total,
  c.processing_total,
  c.wallet_total,
  c.paid_total,
  c.total_due_creators,
  c.net_revenue,
  c.company_outstanding,

  -- Cachê devido em campanha JÁ CONCLUÍDA que ainda não virou crédito.
  -- Campanha em andamento não entra: ainda é normal não ter gerado saldo.
  case
    when c.campaign_status = 'completed'
      then greatest(c.total_due_creators - c.credited_total, 0)::numeric(14, 2)
    else 0::numeric(14, 2)
  end as pending_to_generate,

  (c.closed_on + 60) as creator_payment_deadline,

  case
    when c.net_revenue is null then null
    else (c.net_revenue - c.total_due_creators)::numeric(14, 2)
  end as margin_value,

  case
    when coalesce(c.agreed_value, 0) = 0 then null
    else round(((c.net_revenue - c.total_due_creators) / c.agreed_value) * 100, 2)
  end as margin_pct,

  case
    when coalesce(c.agreed_value, 0) = 0 then null
    else round((c.company_paid_value / c.agreed_value) * 100, 2)
  end as company_paid_pct,

  (
    (c.company_payment_status = 'pago'     and c.company_outstanding > 0) or
    (c.company_payment_status = 'pendente' and c.company_paid_value  > 0) or
    (c.company_payment_status = 'parcial'  and c.company_paid_value  = 0)
  ) as company_payment_mismatch,

  case when c.closed_on is null then null
       else ((c.closed_on + 60) - c.today_br) end        as days_to_creator_deadline,
  case when c.closed_on is null then null
       else (c.today_br - c.closed_on) end               as days_since_closed,
  case when c.company_payment_estimate is null then null
       else (c.company_payment_estimate - c.today_br) end as days_to_company_estimate,
  case when c.agreed_payment_due_date is null then null
       else (c.agreed_payment_due_date - c.today_br) end  as days_to_agreed_due
from calc c;

revoke all on b2b_finance_overview from anon, authenticated;
grant select on b2b_finance_overview to service_role;

notify pgrst, 'reload schema';
