-- =============================================================================
-- 0043_stage01_sem_confirmacao_grupo.sql
--
-- Etapa 01 deixa de exigir que todos os aprovados estejam marcados como
-- "entrou no grupo do WhatsApp" para ser concluída.
--
-- Remove o blocker 'pending_joins' do case `when 2` de stage_blockers
-- (target 2 = sair da Etapa 01). Junto com a 0042, que tirou
-- 'missing_whatsapp_link', a Etapa 01 fica sem nenhuma trava de WhatsApp:
-- o único blocker que sobra é 'no_approved'.
--
-- Nada do recurso em si foi removido. applications.joined_whatsapp_group, a
-- função mark_joined_group e o toggle no painel continuam existindo — vira
-- controle opcional de acompanhamento em vez de requisito para avançar.
--
-- Postgres não permite editar um único branch de um case, então a função é
-- reproduzida inteira a partir da definição viva em produção.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.stage_blockers(p_campaign_id uuid, p_target smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_blockers   jsonb := '[]'::jsonb;
  v_count      int;
  v_dcount     int;
begin
  if p_target < 1 or p_target > 8 then
    raise exception 'invalid_target';
  end if;

  case p_target
    when 1 then
      return v_blockers;

    when 2 then
      select count(*) into v_count
      from applications
      where campaign_id = p_campaign_id
        and status = 'approved'
        and disqualified_at is null;
      if v_count = 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','no_approved',
            'message','Aprove ao menos um candidato antes de avançar.')
        );
      end if;

    when 3 then
      -- Saindo de 2 (briefing): cada entregável 1..delivery_count precisa de
      -- ao menos UMA opção de briefing com conteúdo (texto ou arquivo).
      select delivery_count into v_dcount from campaigns where id = p_campaign_id;
      select count(*) into v_count
      from generate_series(1, greatest(coalesce(v_dcount, 1), 1)) as g(idx)
      where not exists (
        select 1 from campaign_briefing_options o
        where o.campaign_id = p_campaign_id
          and o.index = g.idx
          and (
            (o.briefing is not null and length(trim(o.briefing)) > 0)
            or o.briefing_file_url is not null
          )
      );
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','missing_briefing','count',v_count,
            'message', v_count || ' entregável(is) sem briefing. Adicione ao menos uma opção (texto ou arquivo) para cada um.')
        );
      end if;

    when 4 then
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null;
      if v_count = 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','no_active_deliveries',
            'message','Nenhuma entrega ativa. Confira aprovações e desclassificações.')
        );
      end if;
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null
        and d.scheduled_date is null;
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','missing_delivery_dates','count',v_count,
            'message', v_count || ' entrega(s) sem data definida.')
        );
      end if;

    when 5 then
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null;
      if v_count = 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','no_active_deliveries',
            'message','Nenhuma entrega ativa para analisar.')
        );
      end if;
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null
        and d.deliverable_status <> 'approved';
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','pending_deliverable_review','count',v_count,
            'message', v_count || ' entregável(is) aguardando aprovação.')
        );
      end if;

    when 6 then
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null
        and (d.publication_date is null or d.publication_platform is null);
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','missing_publication_schedule','count',v_count,
            'message', v_count || ' publicação(ões) sem agenda definida.')
        );
      end if;

    when 7 then
      select count(*) into v_count
      from campaign_deliveries d
      join applications a
        on a.user_id = d.user_id and a.campaign_id = d.campaign_id
      where d.campaign_id = p_campaign_id
        and a.status = 'approved'
        and a.disqualified_at is null
        and d.publication_status <> 'confirmed';
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','pending_publication_confirm','count',v_count,
            'message', v_count || ' publicação(ões) pendente(s) de confirmação.')
        );
      end if;

    when 8 then
      return v_blockers;
  end case;

  return v_blockers;
end;
$function$;

revoke all on function stage_blockers(uuid, smallint) from public;
