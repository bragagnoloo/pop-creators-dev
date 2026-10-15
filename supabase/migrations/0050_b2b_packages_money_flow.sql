-- =============================================================================
-- 0050 — B2B: pacotes de contratação e caminho do dinheiro (aba /admin/b2b)
-- =============================================================================
--
-- Adição 100% aditiva e restrita ao financeiro. NADA em campaigns, applications,
-- balance_credits, withdrawals ou qualquer fluxo de campanha é alterado.
--
--   * b2b_packages      — contratação com valor global que cobre várias
--                         campanhas (ex.: os pacotes da Universal). O valor de
--                         CADA campanha continua em campaign_finance.agreed_value,
--                         preenchido à mão; a aba confere se a soma bate com o
--                         total do pacote. Margem, repasse e carteira seguem
--                         por campanha.
--   * campaign_finance  — novas colunas:
--       package_id        pacote ao qual a campanha pertence (opcional);
--       payment_route     por onde o dinheiro da marca entra:
--                           'popline' = cai na conta do POPline, que retém o
--                                       imposto e repassa ao POPline Creators;
--                           'direto'  = cai direto na conta do POPline Creators,
--                                       sem imposto (tax_rate forçado a 0).
--       nf_issued_at      emissão da nota fiscal;
--       repasse_due_date  data limite do repasse POPline → POPline Creators;
--       repasse_transferred  o POPline já transferiu ao POPline Creators (coluna
--                         "Status" da planilha: TRANSFERIDO / não transferido);
--       repasse_done_at   data efetiva do repasse, quando conhecida.
--       company_last_payment_at  "pgto. realizado" da planilha. Está no texto da
--                         0032, mas nunca chegou ao banco — por isso o
--                         `if not exists`.
--   * b2b_finance_overview — recriada só para expor essas colunas.
--
-- ACESSO: igual à 0032 — RLS sem policies + revoke; só service_role, via
-- /api/admin/b2b/* atrás de requireMasterAdmin().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pacotes
-- -----------------------------------------------------------------------------

create table if not exists b2b_packages (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(trim(name)) between 1 and 160),
  contracting_company text check (contracting_company is null or length(contracting_company) <= 160),
  total_value         numeric(12, 2) check (total_value is null or total_value >= 0),
  notes               text check (notes is null or length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references profiles(id) on delete set null
);

drop trigger if exists b2b_packages_updated_at on b2b_packages;
create trigger b2b_packages_updated_at
  before update on b2b_packages
  for each row execute function set_updated_at();

alter table b2b_packages enable row level security;
-- Sem policies de propósito: acesso apenas via service_role.
revoke all on b2b_packages from anon, authenticated;
grant all on b2b_packages to service_role;

-- -----------------------------------------------------------------------------
-- 2. Novas colunas do financeiro por campanha
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'b2b_payment_route') then
    create type b2b_payment_route as enum ('popline', 'direto');
  end if;
end $$;

alter table campaign_finance
  add column if not exists package_id       uuid references b2b_packages(id) on delete set null,
  add column if not exists payment_route    b2b_payment_route not null default 'popline',
  add column if not exists nf_issued_at     date,
  add column if not exists repasse_due_date date,
  add column if not exists repasse_done_at  date,
  add column if not exists repasse_transferred boolean not null default false,
  add column if not exists company_last_payment_at date;

-- Pagamento direto na conta do POPline Creators não paga imposto.
alter table campaign_finance drop constraint if exists campaign_finance_direto_sem_imposto;
alter table campaign_finance
  add constraint campaign_finance_direto_sem_imposto
  check (payment_route <> 'direto' or tax_rate = 0);

create index if not exists campaign_finance_package_idx
  on campaign_finance(package_id) where package_id is not null;

-- -----------------------------------------------------------------------------
-- 3. b2b_finance_overview — corpo idêntico ao da 0035, acrescido das colunas
--    novas (no base e no select final). Sem objeto dependente; o drop apaga os
--    grants, daí o revoke/grant no fim.
-- -----------------------------------------------------------------------------

drop view if exists b2b_finance_overview;

create view b2b_finance_overview
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
  (c.company_paid_value * (1 - c.tax_rate / 100))::numeric(14, 2) as repasse_net_value
from calc c;

revoke all on b2b_finance_overview from anon, authenticated;
grant select on b2b_finance_overview to service_role;

notify pgrst, 'reload schema';
