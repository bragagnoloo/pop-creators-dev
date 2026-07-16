-- =============================================================================
-- Variações (opções) de briefing por entregável + escolha do participante.
--
-- Evolui o modelo: em vez de UM briefing por entregável (campaign_briefings),
-- cada entregável (index 1..delivery_count) pode ter N opções/variações de
-- briefing. O participante escolhe uma variação por entregável, e a escolha é
-- registrada (admin vê qual cada criador escolheu).
--
-- Unifica: vale para TODAS as campanhas (inclusive delivery_count = 1, index 1).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Opções de briefing por entregável
-- -----------------------------------------------------------------------------
create table campaign_briefing_options (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  index             integer not null check (index >= 1),        -- entregável
  option_number     integer not null check (option_number >= 1),-- id estável da variação
  briefing          text,
  briefing_file_url text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (campaign_id, index, option_number)
);

create index campaign_briefing_options_campaign_idx on campaign_briefing_options (campaign_id);

drop trigger if exists campaign_briefing_options_updated_at on campaign_briefing_options;
create trigger campaign_briefing_options_updated_at
  before update on campaign_briefing_options
  for each row execute function set_updated_at();

alter table campaign_briefing_options enable row level security;

drop policy if exists "brief_opt: read approved or admin" on campaign_briefing_options;
create policy "brief_opt: read approved or admin"
  on campaign_briefing_options for select
  to authenticated
  using (
    can_manage_campaign(campaign_id)
    or exists (
      select 1 from applications a
      where a.campaign_id = campaign_briefing_options.campaign_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    )
  );

drop policy if exists "brief_opt: write campaign admin" on campaign_briefing_options;
create policy "brief_opt: write campaign admin"
  on campaign_briefing_options for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- -----------------------------------------------------------------------------
-- 2. Escolha do participante por entregável
-- -----------------------------------------------------------------------------
create table campaign_briefing_choices (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  index          integer not null check (index >= 1),
  option_number  integer not null check (option_number >= 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (campaign_id, user_id, index)
);

create index campaign_briefing_choices_campaign_idx on campaign_briefing_choices (campaign_id);

drop trigger if exists campaign_briefing_choices_updated_at on campaign_briefing_choices;
create trigger campaign_briefing_choices_updated_at
  before update on campaign_briefing_choices
  for each row execute function set_updated_at();

alter table campaign_briefing_choices enable row level security;

-- Leitura: admin da campanha vê todas; o criador vê a sua.
drop policy if exists "brief_choice: read own or admin" on campaign_briefing_choices;
create policy "brief_choice: read own or admin"
  on campaign_briefing_choices for select
  to authenticated
  using (
    can_manage_campaign(campaign_id)
    or user_id = auth.uid()
  );

-- Escrita do criador: só a própria escolha, e apenas se for aprovado na campanha.
drop policy if exists "brief_choice: creator upsert own" on campaign_briefing_choices;
create policy "brief_choice: creator upsert own"
  on campaign_briefing_choices for all
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from applications a
      where a.campaign_id = campaign_briefing_choices.campaign_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from applications a
      where a.campaign_id = campaign_briefing_choices.campaign_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    )
  );

-- Escrita do admin da campanha (ex.: limpar escolhas ao remover uma opção).
drop policy if exists "brief_choice: admin manage" on campaign_briefing_choices;
create policy "brief_choice: admin manage"
  on campaign_briefing_choices for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- -----------------------------------------------------------------------------
-- 3. Backfill — migra briefings existentes para a opção 1 de cada entregável
-- -----------------------------------------------------------------------------
-- 3a. De campaign_briefings (campanhas com múltiplos entregáveis)
insert into campaign_briefing_options (campaign_id, index, option_number, briefing, briefing_file_url)
select campaign_id, index, 1, briefing, briefing_file_url
from campaign_briefings
on conflict (campaign_id, index, option_number) do nothing;

-- 3b. De campaigns.briefing (campanhas com 1 entregável) -> entregável 1, opção 1
insert into campaign_briefing_options (campaign_id, index, option_number, briefing, briefing_file_url)
select id, 1, 1, briefing, briefing_file_url
from campaigns
where coalesce(delivery_count, 1) <= 1
  and (
    (briefing is not null and length(trim(briefing)) > 0)
    or briefing_file_url is not null
  )
on conflict (campaign_id, index, option_number) do nothing;

-- (Mantemos campaign_briefings como tabela dormente para não quebrar o código
--  ainda em produção durante o deploy; o novo código usa campaign_briefing_options.)

-- -----------------------------------------------------------------------------
-- 4. stage_blockers: case 3 passa a exigir >= 1 opção com conteúdo por entregável
--    (reproduz a função inteira; Postgres não permite editar um único case).
-- -----------------------------------------------------------------------------
create or replace function stage_blockers(p_campaign_id uuid, p_target smallint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_blockers   jsonb := '[]'::jsonb;
  v_count      int;
  v_link       text;
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
$$;

revoke all on function stage_blockers(uuid, smallint) from public;
