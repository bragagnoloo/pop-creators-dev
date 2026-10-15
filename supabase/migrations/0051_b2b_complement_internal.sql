-- =============================================================================
-- 0051 — B2B: campanha complementar e campanha do próprio POPline
-- =============================================================================
--
-- Restrito ao financeiro, como a 0050. A tabela campaigns não é alterada: a FK
-- de complements_campaign_id vive em campaign_finance.
--
--   * payment_route ganha 'interna' = campanha do próprio POPline (cupom PL,
--     Portal POPline): o POPline paga o POPline Creators, sem imposto.
--   * complements_campaign_id = campanha aberta para completar os creators que
--     uma campanha contratada não alcançou. O custo do complemento passa a
--     contar na original (somado no cliente).
--
-- EXECUÇÃO EM DUAS PARTES: o `alter type ... add value` precisa ser commitado
-- antes de o valor novo ser usado (constraint e update abaixo). Pela
-- Management API, rodar a PARTE 1 numa chamada e a PARTE 2 em outra.
-- =============================================================================

-- ----------------------------- PARTE 1 ---------------------------------------
alter type b2b_payment_route add value if not exists 'interna';

-- ----------------------------- PARTE 2 ---------------------------------------
alter table campaign_finance drop constraint if exists campaign_finance_direto_sem_imposto;
alter table campaign_finance drop constraint if exists campaign_finance_rota_sem_imposto;
alter table campaign_finance
  add constraint campaign_finance_rota_sem_imposto
  check (payment_route = 'popline' or tax_rate = 0);

alter table campaign_finance
  add column if not exists complements_campaign_id uuid
    references campaigns(id) on delete set null;

alter table campaign_finance drop constraint if exists campaign_finance_complemento_nao_proprio;
alter table campaign_finance
  add constraint campaign_finance_complemento_nao_proprio
  check (complements_campaign_id is null or complements_campaign_id <> campaign_id);

create index if not exists campaign_finance_complements_idx
  on campaign_finance(complements_campaign_id) where complements_campaign_id is not null;

-- Campanhas do Portal POPline já cadastradas sem imposto viram 'interna'.
update campaign_finance
   set payment_route = 'interna'
 where paying_company = 'Portal POPline'
   and tax_rate = 0
   and payment_route = 'popline';

-- b2b_finance_overview: acrescenta complements_campaign_id no fim. Como a
-- coluna nova vai no fim do select, `create or replace` basta (sem drop, os
-- grants são preservados).

create or replace view b2b_finance_overview
with (security_invoker = on)
as
with participation as (
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
      when c.is_radar  then 'radar'
      when c.is_invite then 'invite'
      else 'standard'
    end as campaign_type,
    c.has_cache,
    (case when c.has_cache then c.cache else 0 end)::numeric(12, 2) as cache,

    (c.created_at at time zone 'America/Sao_Paulo')::date as opened_on,

    f.paying_company,
    f.agreed_value,
    f.contracted_creators,
    f.agreed_payment_due_date,
    f.company_payment_estimate,
    coalesce(f.company_payment_status, 'pendente'::b2b_payment_status) as company_payment_status,
    coalesce(f.company_paid_value, 0)::numeric(12, 2)                  as company_paid_value,
    coalesce(f.tax_rate, 0)::numeric(5, 2)                             as tax_rate,
    f.closed_at_override,
    coalesce(f.finance_status, 'em_aberto'::b2b_finance_status)        as finance_status,
    f.notes,
    f.updated_at as finance_updated_at,

    f.package_id,
    coalesce(f.payment_route, 'popline'::b2b_payment_route)            as payment_route,
    f.nf_issued_at,
    f.repasse_due_date,
    f.repasse_done_at,
    coalesce(f.repasse_transferred, false)                             as repasse_transferred,
    f.company_last_payment_at,
    f.complements_campaign_id,

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
  c.contracted_creators,
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
  case
    when c.contracted_creators is null then null
    else (c.contracted_creators - c.eligible_participants)
  end as creators_gap,
  c.credited_total,
  c.processing_total,
  c.wallet_total,
  c.paid_total,
  c.total_due_creators,
  c.net_revenue,
  c.company_outstanding,

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
       else (c.agreed_payment_due_date - c.today_br) end  as days_to_agreed_due,

  -- Colunas da 0050 no fim, para não deslocar as anteriores.
  c.package_id,
  c.payment_route,
  c.nf_issued_at,
  c.repasse_due_date,
  c.repasse_done_at,
  c.repasse_transferred,
  c.company_last_payment_at,
  -- "V. repasse PC (V. líquido)" da planilha: o que foi pago já sem o imposto.
  (c.company_paid_value * (1 - c.tax_rate / 100))::numeric(14, 2) as repasse_net_value,
  -- 0051
  c.complements_campaign_id
from calc c;


revoke all on b2b_finance_overview from anon, authenticated;
grant select on b2b_finance_overview to service_role;

notify pgrst, 'reload schema';
