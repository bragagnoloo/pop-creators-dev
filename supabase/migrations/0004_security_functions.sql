-- =============================================================================
-- 0004 — Segurança: rate_limits, ai_usage, withdrawal atômico
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rate_limits: contador por chave com janela deslizante
-- -----------------------------------------------------------------------------

create table if not exists rate_limits (
  key text primary key,
  window_end timestamptz not null,
  count integer not null default 0
);

create index if not exists rate_limits_window_end_idx on rate_limits(window_end);

alter table rate_limits enable row level security;

-- Apenas service_role acessa. Nenhuma policy = acesso via client bloqueado.
-- Uso: via função SECURITY DEFINER abaixo.

create or replace function check_rate_limit(
  p_key text,
  p_max integer,
  p_window_ms bigint
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row rate_limits%rowtype;
begin
  select * into v_row from rate_limits where key = p_key for update;

  if not found or v_row.window_end < v_now then
    insert into rate_limits (key, window_end, count)
    values (p_key, v_now + (p_window_ms::numeric / 1000.0 || ' seconds')::interval, 1)
    on conflict (key) do update
      set window_end = excluded.window_end,
          count = excluded.count;
    return jsonb_build_object('allowed', true);
  end if;

  if v_row.count >= p_max then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_ms', greatest(0, (extract(epoch from (v_row.window_end - v_now)) * 1000)::bigint)
    );
  end if;

  update rate_limits set count = count + 1 where key = p_key;
  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function check_rate_limit(text, integer, bigint) from public;

-- Garbage collect entradas expiradas há mais de 1 dia. Chamável por admin/cron.
create or replace function gc_rate_limits()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from rate_limits where window_end < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function gc_rate_limits() from public;

-- -----------------------------------------------------------------------------
-- ai_usage: controle de chamadas à IA por usuário/mês
-- -----------------------------------------------------------------------------

create table if not exists ai_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  year_month text not null,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create index if not exists ai_usage_user_idx on ai_usage(user_id);

alter table ai_usage enable row level security;

-- Usuário pode LER o próprio uso (pra mostrar na UI); escrita só via função definer.
create policy "ai_usage: user reads own"
  on ai_usage for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- Incrementa atomicamente e retorna total do mês corrente.
create or replace function record_ai_call(p_user_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
  v_calls integer;
begin
  insert into ai_usage (user_id, year_month, calls, updated_at)
  values (p_user_id, v_month, 1, now())
  on conflict (user_id, year_month) do update
    set calls = ai_usage.calls + 1,
        updated_at = now()
  returning calls into v_calls;
  return v_calls;
end;
$$;

revoke all on function record_ai_call(uuid) from public;

create or replace function get_ai_usage_current_month(p_user_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select calls from ai_usage
     where user_id = p_user_id and year_month = to_char(now(), 'YYYY-MM')),
    0
  );
$$;

revoke all on function get_ai_usage_current_month(uuid) from public;
grant execute on function get_ai_usage_current_month(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- request_withdrawal: saque atômico com lock FIFO de créditos
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

  -- Lê chave PIX direto do profile (fonte de verdade, nunca confiar em client)
  select pix_key, pix_key_type into v_pix_key, v_pix_key_type
  from profiles where id = v_user_id;

  if v_pix_key is null or length(trim(v_pix_key)) < 1 or v_pix_key_type is null then
    return jsonb_build_object('success', false, 'error', 'Cadastre uma chave PIX antes de sacar.');
  end if;

  v_remaining := p_amount;

  -- Lock todos os créditos disponíveis do usuário (ordem FIFO)
  -- O FOR UPDATE impede que outra transação leia/altere os mesmos créditos.
  select coalesce(sum(amount - consumed_amount), 0)
  into v_available
  from balance_credits
  where user_id = v_user_id
    and status = 'available'
    and amount - consumed_amount > 0
  for update;

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

  insert into withdrawals (user_id, amount, pix_key, pix_key_type, status, consumed_credits)
  values (v_user_id, p_amount, v_pix_key, v_pix_key_type, 'requested', v_consumed)
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
      'consumed_credits', v_withdrawal.consumed_credits
    )
  );
end;
$$;

revoke all on function request_withdrawal(numeric) from public;
grant execute on function request_withdrawal(numeric) to authenticated;
