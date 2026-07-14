-- =============================================================================
-- 0026 — Campanha Convite (campanha confidencial por convite)
-- =============================================================================
--
-- Adição 100% aditiva de um novo estilo de campanha. NÃO altera o comportamento
-- das campanhas públicas existentes:
--   * Nova coluna is_invite default false → toda campanha atual continua pública.
--   * A policy pública "campaigns: read authenticated" (using true) NÃO é tocada.
--     A confidencialidade é obtida ADICIONANDO uma policy AS RESTRICTIVE, que só
--     restringe quando is_invite = true (para is_invite = false avalia sempre true).
--   * apply_with_term ganha apenas um early-return para is_invite = true.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna is_invite
-- -----------------------------------------------------------------------------

alter table campaigns
  add column if not exists is_invite boolean not null default false;

-- Index parcial: acelera qualquer filtro por campanhas convite (poucas linhas).
create index if not exists campaigns_is_invite_idx on campaigns(is_invite) where is_invite;

-- -----------------------------------------------------------------------------
-- 2. Helper: usuário atual é participante da campanha?
--    SECURITY DEFINER (mesmo padrão de is_any_admin/can_manage_campaign) para
--    ser usado com segurança dentro da policy RESTRICTIVE, sem depender do RLS
--    da tabela applications.
-- -----------------------------------------------------------------------------

create or replace function is_campaign_participant(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from applications
    where campaign_id = p_campaign_id
      and user_id = auth.uid()
  );
$$;

revoke all on function is_campaign_participant(uuid) from public;
grant execute on function is_campaign_participant(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Confidencialidade via policy ADITIVA (AS RESTRICTIVE)
--    Efetivo: using(true)  AND  (is_invite=false OR admin OR participante)
--    Para campanha pública (is_invite=false): true AND true = idêntico a hoje.
-- -----------------------------------------------------------------------------

drop policy if exists "campaigns: hide invite from non-participants" on campaigns;

create policy "campaigns: hide invite from non-participants"
  on campaigns as restrictive for select
  to authenticated
  using (
    is_invite = false
    or is_any_admin()
    or is_campaign_participant(id)
  );

-- -----------------------------------------------------------------------------
-- 4. Guard em apply_with_term: impedir autoinscrição em campanha convite.
--    Recriada idêntica à 0005, com apenas o early-return de is_invite adicionado.
--    (A RPC é SECURITY DEFINER e ignora RLS, então o guard é necessário mesmo
--     com a campanha oculta.)
-- -----------------------------------------------------------------------------

create or replace function apply_with_term(
  p_campaign_id uuid,
  p_term_version text,
  p_user_agent text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign campaigns%rowtype;
  v_application applications%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Não autenticado.');
  end if;
  if p_campaign_id is null then
    return jsonb_build_object('success', false, 'error', 'Campanha inválida.');
  end if;
  if p_term_version is null or length(trim(p_term_version)) = 0 then
    return jsonb_build_object('success', false, 'error', 'Versão do termo ausente.');
  end if;

  select * into v_campaign from campaigns where id = p_campaign_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Campanha não encontrada.');
  end if;
  -- NOVO: campanha convite não aceita autoinscrição (entrada só via add_campaign_guest).
  if v_campaign.is_invite then
    return jsonb_build_object('success', false, 'error', 'Campanha apenas por convite.');
  end if;
  if v_campaign.status <> 'open' then
    return jsonb_build_object('success', false, 'error', 'Campanha não está aberta para inscrições.');
  end if;

  -- Registra aceite do termo (idempotente por user/campaign/version)
  insert into campaign_term_acceptances (user_id, campaign_id, term_version, user_agent)
  values (v_user_id, p_campaign_id, p_term_version, p_user_agent)
  on conflict (user_id, campaign_id, term_version) do nothing;

  -- Cria/recupera application
  select * into v_application
  from applications
  where campaign_id = p_campaign_id and user_id = v_user_id;

  if not found then
    insert into applications (campaign_id, user_id, status)
    values (p_campaign_id, v_user_id, 'pending')
    returning * into v_application;
  end if;

  return jsonb_build_object(
    'success', true,
    'application', jsonb_build_object(
      'id', v_application.id,
      'campaign_id', v_application.campaign_id,
      'user_id', v_application.user_id,
      'status', v_application.status,
      'applied_at', v_application.applied_at
    )
  );
end;
$$;

revoke all on function apply_with_term(uuid, text, text) from public;
grant execute on function apply_with_term(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RPC add_campaign_guest — admin adiciona um convidado direto como 'approved'
-- -----------------------------------------------------------------------------

create or replace function add_campaign_guest(
  p_campaign_id uuid,
  p_user_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_campaign campaigns%rowtype;
  v_application applications%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Não autenticado.');
  end if;
  if p_campaign_id is null or p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Parâmetros inválidos.');
  end if;

  select * into v_campaign from campaigns where id = p_campaign_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Campanha não encontrada.');
  end if;
  if not v_campaign.is_invite then
    return jsonb_build_object('success', false, 'error', 'Esta ação é exclusiva de campanhas convite.');
  end if;
  if not can_manage_campaign(p_campaign_id) then
    return jsonb_build_object('success', false, 'error', 'Sem permissão para gerenciar esta campanha.');
  end if;

  -- Garante que o usuário existe
  if not exists (select 1 from profiles where id = p_user_id) then
    return jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  end if;

  -- Insere como 'approved'. Re-adição de alguém removido/desclassificado limpa o estado.
  insert into applications (campaign_id, user_id, status)
  values (p_campaign_id, p_user_id, 'approved')
  on conflict (campaign_id, user_id) do update
    set status = 'approved',
        disqualified_at = null,
        disqualification_reason = null,
        updated_at = now()
  returning * into v_application;

  return jsonb_build_object(
    'success', true,
    'application', jsonb_build_object(
      'id', v_application.id,
      'campaign_id', v_application.campaign_id,
      'user_id', v_application.user_id,
      'status', v_application.status,
      'applied_at', v_application.applied_at
    )
  );
end;
$$;

revoke all on function add_campaign_guest(uuid, uuid) from public;
grant execute on function add_campaign_guest(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. RPC remove_campaign_guest — remove um convidado adicionado por engano.
--    Hard delete da application + das deliveries do par (campaign_id, user_id),
--    pois campaign_deliveries NÃO tem FK para applications (não cascateia).
--    As revisões cascateiam de campaign_deliveries.
-- -----------------------------------------------------------------------------

create or replace function remove_campaign_guest(
  p_application_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_app applications%rowtype;
  v_campaign campaigns%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Não autenticado.');
  end if;

  select * into v_app from applications where id = p_application_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Convidado não encontrado.');
  end if;

  select * into v_campaign from campaigns where id = v_app.campaign_id;
  if not v_campaign.is_invite then
    return jsonb_build_object('success', false, 'error', 'Esta ação é exclusiva de campanhas convite.');
  end if;
  if not can_manage_campaign(v_app.campaign_id) then
    return jsonb_build_object('success', false, 'error', 'Sem permissão para gerenciar esta campanha.');
  end if;

  -- Limpa deliveries do usuário nesta campanha (revisões cascateiam).
  delete from campaign_deliveries
   where campaign_id = v_app.campaign_id
     and user_id = v_app.user_id;

  delete from applications where id = p_application_id;

  return jsonb_build_object('success', true, 'removed_application_id', p_application_id);
end;
$$;

revoke all on function remove_campaign_guest(uuid) from public;
grant execute on function remove_campaign_guest(uuid) to authenticated;
