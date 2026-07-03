-- 0023 — Fix crítico da RPC de saque + titularidade + notificação por divergência
--
-- 1) Corrige o bug FOR UPDATE + SUM() em request_withdrawal (todos os saques
--    falhavam com "ERROR 0A000: FOR UPDATE is not allowed with aggregate functions").
-- 2) Adiciona pix_holder_name em profiles e snapshot no withdrawal para o admin
--    validar titularidade sem sofrer efeito de edições posteriores do profile.
-- 3) Novo status 'flagged' + RPC flag_withdrawal que reverte os créditos e
--    marca o saque como interrompido por conformidade.

-- Enum: adiciona 'flagged'. add value é fora de transação, tem de vir antes
-- de qualquer coisa que consulte o novo valor.
alter type withdrawal_status add value if not exists 'flagged';

-- Colunas em profiles
alter table profiles add column if not exists pix_holder_name text;

-- Colunas em withdrawals (snapshots + flagging)
alter table withdrawals add column if not exists pix_holder_name text;
alter table withdrawals add column if not exists profile_name_snapshot text;
alter table withdrawals add column if not exists flagged_at timestamptz;
alter table withdrawals add column if not exists flag_reason text;

-- -----------------------------------------------------------------------------
-- request_withdrawal — versão corrigida
-- -----------------------------------------------------------------------------
create or replace function request_withdrawal(
  p_amount numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pix_key text;
  v_pix_key_type pix_key_type;
  v_pix_holder_name text;
  v_profile_name text;
  v_available numeric := 0;
  v_credit balance_credits%rowtype;
  v_remaining numeric;
  v_take numeric;
  v_consumed jsonb := '[]'::jsonb;
  v_withdrawal withdrawals%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Não autenticado.');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Valor inválido.');
  end if;

  -- Lê PIX + nome do titular + nome do profile (snapshot). Fonte de verdade,
  -- nunca confia no client.
  select pix_key, pix_key_type, pix_holder_name, full_name
    into v_pix_key, v_pix_key_type, v_pix_holder_name, v_profile_name
  from profiles where id = v_user_id;

  if v_pix_key is null or length(trim(v_pix_key)) < 1 or v_pix_key_type is null then
    return jsonb_build_object('success', false, 'error', 'Cadastre uma chave PIX antes de sacar.');
  end if;
  if v_pix_holder_name is null or length(trim(v_pix_holder_name)) < 1 then
    return jsonb_build_object('success', false, 'error', 'Cadastre o nome do titular da conta antes de sacar.');
  end if;

  v_remaining := p_amount;

  -- Fix do bug: primeiro lock nas rows (sem agregado), depois soma.
  perform 1 from balance_credits
   where user_id = v_user_id
     and status = 'available'
     and amount - consumed_amount > 0
   for update;

  select coalesce(sum(amount - consumed_amount), 0)
    into v_available
  from balance_credits
   where user_id = v_user_id
     and status = 'available'
     and amount - consumed_amount > 0;

  if p_amount > v_available then
    return jsonb_build_object('success', false, 'error', 'Saldo disponível insuficiente.');
  end if;

  for v_credit in
    select * from balance_credits
    where user_id = v_user_id
      and status = 'available'
      and amount - consumed_amount > 0
    order by created_at asc
  loop
    exit when v_remaining <= 0;
    v_take := least(v_credit.amount - v_credit.consumed_amount, v_remaining);

    update balance_credits
    set consumed_amount = consumed_amount + v_take,
        status = case
          when consumed_amount + v_take >= amount then 'withdrawn'::credit_status
          else status
        end
    where id = v_credit.id;

    v_consumed := v_consumed || jsonb_build_array(
      jsonb_build_object('creditId', v_credit.id, 'amount', v_take)
    );
    v_remaining := v_remaining - v_take;
  end loop;

  insert into withdrawals (
    user_id, amount, pix_key, pix_key_type, status, consumed_credits,
    pix_holder_name, profile_name_snapshot
  )
  values (
    v_user_id, p_amount, v_pix_key, v_pix_key_type, 'requested', v_consumed,
    v_pix_holder_name, v_profile_name
  )
  returning * into v_withdrawal;

  return jsonb_build_object(
    'success', true,
    'withdrawal', jsonb_build_object(
      'id', v_withdrawal.id,
      'user_id', v_withdrawal.user_id,
      'amount', v_withdrawal.amount,
      'pix_key', v_withdrawal.pix_key,
      'pix_key_type', v_withdrawal.pix_key_type,
      'status', v_withdrawal.status,
      'created_at', v_withdrawal.created_at,
      'paid_at', v_withdrawal.paid_at,
      'consumed_credits', v_withdrawal.consumed_credits,
      'pix_holder_name', v_withdrawal.pix_holder_name,
      'profile_name_snapshot', v_withdrawal.profile_name_snapshot
    )
  );
end;
$$;

revoke all on function request_withdrawal(numeric) from public;
grant execute on function request_withdrawal(numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- flag_withdrawal — admin reverte um saque por divergência de dados
-- -----------------------------------------------------------------------------
create or replace function flag_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_withdrawal withdrawals%rowtype;
  v_item jsonb;
  v_credit_id uuid;
  v_amount numeric;
begin
  if not is_admin() then
    return jsonb_build_object('success', false, 'error', 'Sem permissão.');
  end if;

  -- Lock o withdrawal — só reverte se ainda estiver requested.
  select * into v_withdrawal from withdrawals
   where id = p_withdrawal_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Saque não encontrado.');
  end if;
  if v_withdrawal.status <> 'requested' then
    return jsonb_build_object('success', false, 'error', 'Só é possível notificar saques pendentes.');
  end if;

  -- Devolve os valores consumidos para os créditos originais.
  for v_item in select * from jsonb_array_elements(v_withdrawal.consumed_credits)
  loop
    v_credit_id := (v_item->>'creditId')::uuid;
    v_amount    := (v_item->>'amount')::numeric;
    update balance_credits
       set consumed_amount = greatest(0, consumed_amount - v_amount),
           status = 'available'::credit_status
     where id = v_credit_id;
  end loop;

  update withdrawals
     set status = 'flagged',
         flagged_at = now(),
         flag_reason = p_reason
   where id = p_withdrawal_id;

  return jsonb_build_object(
    'success', true,
    'user_id', v_withdrawal.user_id,
    'amount',  v_withdrawal.amount
  );
end;
$$;

revoke all on function flag_withdrawal(uuid, text) from public;
grant execute on function flag_withdrawal(uuid, text) to authenticated;
