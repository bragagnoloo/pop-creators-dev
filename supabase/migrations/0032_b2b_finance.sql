-- =============================================================================
-- 0032 — B2B: controle financeiro das campanhas (aba /admin/b2b)
-- =============================================================================
--
-- Adição 100% aditiva. NENHUM objeto existente é alterado: nada de alter/drop em
-- tabela, policy ou função já existente. Os fluxos de campanha, candidatura,
-- entrega, crédito e saque continuam idênticos.
--
--   * campaign_finance      — 1:1 opcional com campaigns; guarda SÓ os campos que
--                             o master admin preenche à mão.
--   * b2b_finance_overview  — view que junta esses campos com os agregados
--                             derivados do banco (participantes aptos, cachê
--                             devido, carteira, pago efetivamente, datas de
--                             abertura/encerramento, margem e insumos do
--                             termômetro de risco).
--
-- ACESSO: MASTER ADMIN apenas.
--   - campaign_finance: RLS ligada SEM policies (mesmo padrão de rate_limits e
--     campanha_confidencial_inscricoes) => nenhum cliente browser lê ou escreve.
--   - b2b_finance_overview: views não têm RLS própria. O controle de acesso é o
--     `revoke ... from anon, authenticated` no fim deste arquivo — ele é
--     OBRIGATÓRIO, porque as default privileges do Supabase concedem acesso
--     automático a objetos novos no schema public. A view é criada com
--     security_invoker = on para que, mesmo se alguém conceder acesso depois, a
--     RLS das tabelas de base continue valendo (defesa em profundidade).
--   Tudo passa por /api/admin/b2b/*, que usa createAdminClient() (service_role,
--   ignora RLS) atrás de requireMasterAdmin().
--
-- FUSO: todo timestamptz vira data via `at time zone 'America/Sao_Paulo'` e o
-- "hoje" é `(now() at time zone 'America/Sao_Paulo')::date`. NUNCA current_date
-- cru — a sessão do Supabase é UTC, então depois das 21h de Brasília ele já
-- retorna o dia seguinte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'b2b_finance_status') then
    create type b2b_finance_status as enum ('em_aberto', 'finalizada');
  end if;
  if not exists (select 1 from pg_type where typname = 'b2b_payment_status') then
    create type b2b_payment_status as enum ('pendente', 'parcial', 'pago');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabela dos campos editáveis pelo admin
-- -----------------------------------------------------------------------------

create table if not exists campaign_finance (
  campaign_id              uuid primary key references campaigns(id) on delete cascade,

  -- Empresa responsável pelo pagamento da campanha.
  paying_company           text,

  -- Valor acordado com a empresa (receita B2B bruta da campanha).
  agreed_value             numeric(12, 2) check (agreed_value is null or agreed_value >= 0),

  -- Data-limite contratual para a empresa pagar o valor acordado.
  agreed_payment_due_date  date,
  -- Data em que se espera de fato o pagamento (estimativa operacional).
  company_payment_estimate date,

  -- Pagamento da empresa pode ser parcial: status declarado + acumulado pago.
  company_payment_status   b2b_payment_status not null default 'pendente',
  company_paid_value       numeric(12, 2) not null default 0 check (company_paid_value >= 0),
  company_last_payment_at  date,

  -- Percentual de imposto aplicado sobre o valor acordado.
  tax_rate                 numeric(5, 2) not null default 0
                             check (tax_rate >= 0 and tax_rate <= 100),

  -- Sobrescreve a data de encerramento derivada das etapas, quando a data real
  -- diverge do que foi registrado no painel da campanha.
  closed_at_override       date,

  finance_status           b2b_finance_status not null default 'em_aberto',
  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references profiles(id) on delete set null
);

create index if not exists campaign_finance_status_idx
  on campaign_finance(finance_status);
create index if not exists campaign_finance_payment_status_idx
  on campaign_finance(company_payment_status);

-- Otimiza o rollup de "pago efetivamente" (só saques pagos interessam).
create index if not exists withdrawals_paid_idx
  on withdrawals(status) where status = 'paid';

drop trigger if exists campaign_finance_updated_at on campaign_finance;
create trigger campaign_finance_updated_at
  before update on campaign_finance
  for each row execute function set_updated_at();

alter table campaign_finance enable row level security;
-- Sem policies de propósito: acesso apenas via service_role.

-- -----------------------------------------------------------------------------
-- 3. View de leitura — uma linha por campanha (TODAS: padrão, convite e review)
-- -----------------------------------------------------------------------------

drop view if exists b2b_finance_overview;

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
    -- "Em carteira" = disponível e ainda não consumido por saque.
    coalesce(sum(greatest(bc.amount - bc.consumed_amount, 0))
             filter (where bc.status = 'available'), 0)::numeric(14, 2)
      as wallet_total
  from balance_credits bc
  group by bc.campaign_id
),
paid_rollup as (
  -- Saques consomem créditos em FIFO e registram consumed_credits jsonb no
  -- formato [{creditId, amount}] (ver request_withdrawal em 0023). Para saber
  -- quanto de CADA campanha foi de fato pago, expande o array e volta ao
  -- crédito de origem.
  --
  -- w.status = 'paid' é obrigatório: flag_withdrawal() estorna os créditos mas
  -- NÃO limpa consumed_credits — sem esse filtro, saque revertido contaria
  -- como pago.
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
  -- Última etapa efetivamente concluída.
  --
  -- NÃO usar "stage = 8": complete_stage() (0015) grava completed_at na etapa
  -- que está sendo CONCLUÍDA e recusa quando current_stage >= 8. Quem faz a
  -- campanha virar 'completed' é a conclusão da etapa 7, então a linha da
  -- etapa 8 nunca recebe completed_at. max() é robusto a isso e a reversões
  -- (revert_stage zera o completed_at da etapa revertida).
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

    -- Data de abertura = criação da campanha, no fuso de Brasília.
    (c.created_at at time zone 'America/Sao_Paulo')::date as opened_on,

    f.paying_company,
    f.agreed_value,
    f.agreed_payment_due_date,
    f.company_payment_estimate,
    coalesce(f.company_payment_status, 'pendente'::b2b_payment_status) as company_payment_status,
    coalesce(f.company_paid_value, 0)::numeric(12, 2)                  as company_paid_value,
    f.company_last_payment_at,
    coalesce(f.tax_rate, 0)::numeric(5, 2)                             as tax_rate,
    f.closed_at_override,
    coalesce(f.finance_status, 'em_aberto'::b2b_finance_status)        as finance_status,
    f.notes,
    f.updated_at as finance_updated_at,

    -- Encerramento: override manual > última etapa concluída > stage_updated_at.
    -- O override vence sempre, inclusive se a campanha for revertida depois —
    -- é uma decisão explícita do admin. A UI sinaliza esse caso.
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

    coalesce(p.eligible_participants, 0)            as eligible_participants,
    coalesce(cr.credited_total, 0)::numeric(14, 2)  as credited_total,
    coalesce(cr.processing_total, 0)::numeric(14, 2) as processing_total,
    coalesce(cr.wallet_total, 0)::numeric(14, 2)    as wallet_total,
    coalesce(pr.paid_total, 0)::numeric(14, 2)      as paid_total
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
  c.company_last_payment_at,
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

  -- Prazo limite para pagamento dos creators: 60 dias após o encerramento.
  (c.closed_on + 60) as creator_payment_deadline,

  case
    when c.net_revenue is null then null
    else (c.net_revenue - c.total_due_creators)::numeric(14, 2)
  end as margin_value,

  -- Guarda de divisão por zero: sem valor acordado a margem % é indefinida
  -- (null), nunca Infinity/NaN.
  case
    when coalesce(c.agreed_value, 0) = 0 then null
    else round(((c.net_revenue - c.total_due_creators) / c.agreed_value) * 100, 2)
  end as margin_pct,

  case
    when coalesce(c.agreed_value, 0) = 0 then null
    else round((c.company_paid_value / c.agreed_value) * 100, 2)
  end as company_paid_pct,

  -- Status declarado contradiz o valor lançado? Só sinaliza na UI.
  (
    (c.company_payment_status = 'pago'     and c.company_outstanding > 0) or
    (c.company_payment_status = 'pendente' and c.company_paid_value  > 0) or
    (c.company_payment_status = 'parcial'  and c.company_paid_value  = 0)
  ) as company_payment_mismatch,

  -- Insumos do termômetro de risco (o score é calculado na aplicação).
  case when c.closed_on is null then null
       else ((c.closed_on + 60) - c.today_br) end        as days_to_creator_deadline,
  case when c.closed_on is null then null
       else (c.today_br - c.closed_on) end               as days_since_closed,
  case when c.company_payment_estimate is null then null
       else (c.company_payment_estimate - c.today_br) end as days_to_company_estimate,
  case when c.agreed_payment_due_date is null then null
       else (c.agreed_payment_due_date - c.today_br) end  as days_to_agreed_due
from calc c;

-- -----------------------------------------------------------------------------
-- 4. View de reconciliação — uma linha só, nível plataforma
-- -----------------------------------------------------------------------------
--
-- Nem todo real efetivamente pago é atribuível a uma campanha: existem saques
-- pagos cujo consumed_credits aponta para um balance_credits que não existe
-- mais (crédito apagado depois do saque). Esse dinheiro saiu de verdade, mas
-- não tem campanha de origem, então some do rollup por campanha.
--
-- Sem essa reconciliação, o big number "cachê pago efetivamente" sub-reportaria
-- silenciosamente. paid_unattributed é a diferença entre a verdade
-- (withdrawals.amount dos saques pagos) e o que foi possível atribuir — cobre
-- tanto crédito órfão quanto consumed_credits vazio ou incompleto.

drop view if exists b2b_finance_platform;

create view b2b_finance_platform
with (security_invoker = on)
as
select
  coalesce(t.paid_total_all, 0)::numeric(14, 2)                              as paid_total_all,
  coalesce(a.paid_attributed, 0)::numeric(14, 2)                             as paid_attributed,
  greatest(coalesce(t.paid_total_all, 0) - coalesce(a.paid_attributed, 0), 0)::numeric(14, 2)
                                                                             as paid_unattributed
from
  (select sum(w.amount) as paid_total_all
     from withdrawals w
    where w.status = 'paid') t,
  (select sum((item->>'amount')::numeric) as paid_attributed
     from withdrawals w
     cross join lateral jsonb_array_elements(w.consumed_credits) as item
     join balance_credits bc on bc.id = (item->>'creditId')::uuid
    where w.status = 'paid'
      and jsonb_typeof(w.consumed_credits) = 'array') a;

-- -----------------------------------------------------------------------------
-- 5. Grants — o revoke É o controle de acesso das views. Não remover.
-- -----------------------------------------------------------------------------

revoke all on b2b_finance_overview from anon, authenticated;
grant select on b2b_finance_overview to service_role;

revoke all on b2b_finance_platform from anon, authenticated;
grant select on b2b_finance_platform to service_role;

-- Garante que o PostgREST enxergue a tabela e a view recém-criadas.
notify pgrst, 'reload schema';
