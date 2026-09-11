-- =============================================================================
-- 0037 — Saldo não pode ser gerado (nem liberado) para participante desclassificado
-- =============================================================================
--
-- Sintoma: em 2026-09-03 dois saldos de R$ 200 foram gerados por engano para
-- criadores que já estavam desclassificados nas respectivas campanhas
-- (Bruna dos Santos Bisoni / Universal Music Jão e Rafael Oliveira / Roberta Sá).
-- Nenhum dos dois chegou a ser liberado para saque; ambos foram removidos à mão
-- antes desta migration.
--
-- Causa: "Gerar saldo" é um insert direto em balance_credits pelo cliente
-- (services/wallet.ts → createCredit), autorizado pela policy
-- "credits: admin writes" (can_manage_campaign). Nem a policy nem a interface
-- olhavam applications.disqualified_at — o botão continuava clicável ao lado do
-- badge "Desclassificado".
--
-- Correção em duas camadas: a interface desabilita o botão (mudança de código),
-- e este trigger fecha a porta de verdade — a interface é só conveniência, quem
-- decide é o banco, porque o navegador escreve na tabela com a anon key.
--
-- Escopo deliberadamente estreito: bloqueia INSERT (gerar saldo) e a transição
-- processing → available (liberar saque). NÃO bloqueia consumo de crédito
-- (request_withdrawal escreve consumed_amount / status 'withdrawn') nem o estorno
-- de flag_withdrawal (volta para 'available' vindo de 'withdrawn'). Se isso fosse
-- bloqueado, um crédito legítimo anterior a esta migration poderia travar o saque
-- de alguém desclassificado depois — o dinheiro já era devido.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Guard
-- -----------------------------------------------------------------------------

create or replace function a_guard_credit_not_disqualified()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_disqualified boolean;
begin
  -- Só interessa gerar (insert) e liberar (processing -> available).
  if tg_op = 'UPDATE'
     and not (old.status = 'processing' and new.status = 'available') then
    return new;
  end if;

  select a.disqualified_at is not null
    into v_disqualified
  from applications a
  where a.campaign_id = new.campaign_id
    and a.user_id = new.user_id;

  if coalesce(v_disqualified, false) then
    -- Atenção: com texto no raise, a mensagem NÃO pode voltar em `using` —
    -- o par gera "RAISE option already specified: MESSAGE" e o admin veria esse
    -- erro interno no lugar do aviso. Só errcode vai no using.
    raise exception 'Participante desclassificado nesta campanha: não é possível gerar ou liberar saldo.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Prefixo a_ para ordenar antes de qualquer outro trigger, mesmo padrão da 0036.
drop trigger if exists a_guard_credit_not_disqualified on balance_credits;
create trigger a_guard_credit_not_disqualified
  before insert or update on balance_credits
  for each row execute function a_guard_credit_not_disqualified();

revoke all on function a_guard_credit_not_disqualified() from public;

notify pgrst, 'reload schema';
