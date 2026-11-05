-- =============================================================================
-- 0055 — Saldo proporcional às entregas confirmadas
-- =============================================================================
--
-- O cachê da campanha (campaigns.cache) é o valor de TODAS as entregas somadas
-- (delivery_count). Em campanha com mais de uma entrega, quem fez só parte delas
-- deve receber só por essas: cachê ÷ delivery_count × entregas com publicação
-- confirmada (Etapa 06, campaign_deliveries.publication_status = 'confirmed').
--
-- Até aqui o guard a_guard_credit_integrity (0045) exigia amount = cache, então
-- o saldo parcial gerado pela tela (admin/campaigns/[id] → computeCreditAmount)
-- seria recusado. Esta migration troca SÓ a checagem de valor; o resto do guard
-- (status inicial, inscrição aprovada, UPDATE só para liberar) fica idêntico.
--
-- Regra aceita no INSERT pelo cliente:
--   • delivery_count = 1                → amount = cache (como antes)
--   • todas as entregas confirmadas     → amount = cache (como antes)
--   • parte confirmada (≥ 1)            → amount = round(cache / total × confirmadas, 2),
--                                          com tolerância de 1 centavo (o navegador
--                                          calcula em float, o banco em numeric)
--   • nenhuma confirmada (total > 1)    → recusado
--
-- Saldos já existentes não são tocados. Service role / funções internas
-- continuam passando direto, como na 0045.
-- =============================================================================

create or replace function a_guard_credit_integrity()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_cache numeric;
  v_total integer;
  v_confirmed integer;
  v_expected numeric;
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

    select cache, greatest(coalesce(delivery_count, 1), 1)
      into v_cache, v_total
      from campaigns where id = new.campaign_id;
    if v_cache is null then
      raise exception 'Valor do saldo diferente do cachê da campanha.'
        using errcode = 'check_violation';
    end if;

    if v_total = 1 then
      v_confirmed := 1;
    else
      select least(count(*)::integer, v_total)
        into v_confirmed
        from campaign_deliveries d
       where d.campaign_id = new.campaign_id
         and d.user_id = new.user_id
         and d.publication_status = 'confirmed';
    end if;

    if v_confirmed = 0 then
      raise exception 'Nenhuma publicação confirmada: não é possível gerar saldo.'
        using errcode = 'check_violation';
    end if;

    if v_confirmed = v_total then
      v_expected := v_cache;
      if new.amount <> v_expected then
        raise exception 'Valor do saldo diferente do cachê da campanha.'
          using errcode = 'check_violation';
      end if;
    else
      v_expected := round(v_cache / v_total * v_confirmed, 2);
      if abs(new.amount - v_expected) > 0.01 then
        raise exception 'Valor do saldo diferente do proporcional às entregas confirmadas.'
          using errcode = 'check_violation';
      end if;
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

revoke all on function a_guard_credit_integrity() from public;

notify pgrst, 'reload schema';
