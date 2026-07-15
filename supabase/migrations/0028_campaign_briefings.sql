-- =============================================================================
-- Briefing por entregável (index) para campanhas com mais de 1 entrega.
--
-- Contexto: hoje o briefing é único por campanha (campaigns.briefing /
-- briefing_file_url). Quando delivery_count > 1, cada entregável (index 1..N,
-- compartilhado entre todos os criadores) precisa do seu próprio briefing.
--
-- Estratégia:
--   - delivery_count <= 1: continua usando campaigns.briefing (inalterado).
--   - delivery_count  > 1: usa esta tabela, uma linha por (campaign_id, index).
-- =============================================================================

create table campaign_briefings (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  index             integer not null check (index >= 1),
  briefing          text,
  briefing_file_url text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (campaign_id, index)
);

create index campaign_briefings_campaign_idx on campaign_briefings (campaign_id);

drop trigger if exists campaign_briefings_updated_at on campaign_briefings;
create trigger campaign_briefings_updated_at
  before update on campaign_briefings
  for each row execute function set_updated_at();

alter table campaign_briefings enable row level security;

-- RLS espelha campaign_stage_schedule: aprovados leem, admin da campanha escreve.
drop policy if exists "briefings_idx: read approved or admin" on campaign_briefings;
create policy "briefings_idx: read approved or admin"
  on campaign_briefings for select
  to authenticated
  using (
    can_manage_campaign(campaign_id)
    or exists (
      select 1 from applications a
      where a.campaign_id = campaign_briefings.campaign_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    )
  );

drop policy if exists "briefings_idx: write campaign admin" on campaign_briefings;
create policy "briefings_idx: write campaign admin"
  on campaign_briefings for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- Backfill: campanhas com >1 entregável que já tinham briefing único herdam-no
-- como briefing do entregável 1, para não perder o conteúdo existente.
insert into campaign_briefings (campaign_id, index, briefing, briefing_file_url)
select id, 1, briefing, briefing_file_url
from campaigns
where delivery_count > 1
  and (
    (briefing is not null and length(trim(briefing)) > 0)
    or briefing_file_url is not null
  )
on conflict (campaign_id, index) do nothing;

-- -----------------------------------------------------------------------------
-- stage_blockers: case 3 (saindo da Etapa 02 — Briefing).
-- Reproduz a função inteira (Postgres não permite editar um único case),
-- alterando apenas o case 3 para exigir briefing por entregável quando
-- delivery_count > 1.
-- -----------------------------------------------------------------------------
create or replace function stage_blockers(p_campaign_id uuid, p_target smallint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_blockers   jsonb := '[]'::jsonb;
  v_count      int;
  v_link       text;
  v_briefing   text;
  v_b_file     text;
  v_dcount     int;
begin
  if p_target < 1 or p_target > 8 then
    raise exception 'invalid_target';
  end if;

  case p_target
    when 1 then
      -- Saindo de 0 (abertura): livre. Campanha já existe.
      return v_blockers;

    when 2 then
      -- Saindo de 1 (seleção): pelo menos 1 aprovado ativo + whatsapp link + todos no grupo
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
      select whatsapp_group_link into v_link from campaigns where id = p_campaign_id;
      if v_link is null then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','missing_whatsapp_link',
            'message','Cole o link do grupo do WhatsApp.')
        );
      end if;
      select count(*) into v_count
      from applications
      where campaign_id = p_campaign_id
        and status = 'approved'
        and disqualified_at is null
        and joined_whatsapp_group = false;
      if v_count > 0 then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','pending_joins','count',v_count,
            'message', v_count || ' aprovado(s) ainda não confirmaram presença no grupo.')
        );
      end if;

    when 3 then
      -- Saindo de 2 (briefing).
      select delivery_count into v_dcount from campaigns where id = p_campaign_id;
      if coalesce(v_dcount, 1) <= 1 then
        -- Briefing único: texto OU arquivo na tabela campaigns.
        select briefing, briefing_file_url into v_briefing, v_b_file
          from campaigns where id = p_campaign_id;
        if (v_briefing is null or length(trim(v_briefing)) = 0) and v_b_file is null then
          v_blockers := v_blockers || jsonb_build_array(
            jsonb_build_object('code','missing_briefing',
              'message','Adicione o briefing (texto ou arquivo).')
          );
        end if;
      else
        -- Múltiplos entregáveis: cada index 1..delivery_count precisa de briefing.
        select count(*) into v_count
        from generate_series(1, v_dcount) as g(idx)
        where not exists (
          select 1 from campaign_briefings b
          where b.campaign_id = p_campaign_id
            and b.index = g.idx
            and (
              (b.briefing is not null and length(trim(b.briefing)) > 0)
              or b.briefing_file_url is not null
            )
        );
        if v_count > 0 then
          v_blockers := v_blockers || jsonb_build_array(
            jsonb_build_object('code','missing_briefing','count',v_count,
              'message', v_count || ' entregável(is) sem briefing. Adicione texto ou arquivo para cada um.')
          );
        end if;
      end if;

    when 4 then
      -- Saindo de 3: precisa ter deliveries de aprovados ativos com data
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
      -- Saindo de 4: precisa ter deliveries ativos todos aprovados
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
      -- Saindo de 5: todos deliveries com publication_date e platform
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
      -- Saindo de 6: todos publication_status='confirmed'
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
      -- Saindo de 7: sempre liberado (CSV pode ser baixado anytime)
      return v_blockers;
  end case;

  return v_blockers;
end;
$$;

revoke all on function stage_blockers(uuid, smallint) from public;
