-- =============================================================================
-- 0053 — REC_Plano Anual: plano anual cobrado mês a mês
--
-- A oferta de recuperação de carrinho (plano Hotmart "REC_Plano Anual") libera
-- os recursos do plano anual, mas a Hotmart cobra uma parcela por mês. O acesso
-- precisa acompanhar a cobrança: vale até a próxima parcela (+3 dias de folga).
-- Parcela vencida sem pagamento → aviso por e-mail com 3 dias para regularizar;
-- depois disso o acesso vence e a conta volta ao free.
--
-- Esta tabela guarda a próxima cobrança e se o aviso daquela parcela já saiu.
-- Só objetos novos; quem escreve é o servidor (service role).
-- =============================================================================

create table if not exists rec_annual_billing (
  user_id          uuid primary key references profiles(id) on delete cascade,
  subscriber_code  text,
  next_charge_at   timestamptz not null,
  -- next_charge_at da parcela cujo aviso já foi enviado (um aviso por parcela)
  warned_charge_at timestamptz,
  warned_at        timestamptz,
  updated_at       timestamptz not null default now()
);

alter table rec_annual_billing enable row level security;

-- Sem policies de propósito; revoke depois do create table por causa dos
-- privilégios padrão do Supabase em tabelas novas do schema public.
revoke all on rec_annual_billing from anon, authenticated;
