-- =============================================================================
-- 0054 — Convites do Programa de Afiliados
--
-- O creator que ultrapassa 500 pontos no ranking geral recebe um convite (com o
-- PDF de regras) para se afiliar pela Hotmart. Uma linha por creator convidado:
-- garante que ninguém recebe o convite duas vezes, no disparo inicial ou no
-- envio automático. Só o servidor (service role) lê e grava.
-- =============================================================================

create table if not exists affiliate_invites (
  user_id         uuid primary key references profiles(id) on delete cascade,
  points_at_send  bigint not null,
  resend_email_id text,
  sent_at         timestamptz not null default now()
);

alter table affiliate_invites enable row level security;

-- Sem policies de propósito; revoke depois do create table por causa dos
-- privilégios padrão do Supabase em tabelas novas do schema public.
revoke all on affiliate_invites from anon, authenticated;
