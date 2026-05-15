-- =============================================================================
-- 0015 — Campaign stages: timeline 8 etapas (admin) + barra 3 etapas (criador)
-- =============================================================================
-- Migração puramente aditiva: novos enums, colunas com DEFAULT, tabela nova,
-- RPCs SECURITY DEFINER, bucket de Storage, trigger, backfill.
-- Sem DROP/ALTER em estruturas existentes (exceto ADD COLUMN/ADD CONSTRAINT).

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'deliverable_status') then
    create type deliverable_status as enum ('pending', 'approved', 'needs_revision');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'publication_status') then
    create type publication_status as enum ('pending', 'confirmed', 'not_confirmed', 'needs_resubmit');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Novas colunas em campaigns
-- -----------------------------------------------------------------------------

alter table campaigns
  add column if not exists current_stage smallint not null default 0,
  add column if not exists whatsapp_group_link text,
  add column if not exists briefing_file_url text,
  add column if not exists stage_history jsonb not null default '[]'::jsonb,
  add column if not exists stage_updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_current_stage_range'
  ) then
    alter table campaigns add constraint campaigns_current_stage_range
      check (current_stage between 0 and 8);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_whatsapp_link_format'
  ) then
    alter table campaigns add constraint campaigns_whatsapp_link_format
      check (whatsapp_group_link is null
             or whatsapp_group_link ~* '^https?://(chat\.whatsapp\.com|wa\.me)/.+');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Novas colunas em applications
-- -----------------------------------------------------------------------------

alter table applications
  add column if not exists joined_whatsapp_group boolean not null default false,
  add column if not exists joined_at timestamptz,
  add column if not exists disqualified_at timestamptz,
  add column if not exists disqualification_reason text;

-- -----------------------------------------------------------------------------
-- 4. Novas colunas em campaign_deliveries
-- -----------------------------------------------------------------------------

alter table campaign_deliveries
  add column if not exists deliverable_status deliverable_status not null default 'pending',
  add column if not exists revision_note text,
  add column if not exists revision_due_date timestamptz,
  add column if not exists publication_url text,
  add column if not exists publication_status publication_status not null default 'pending',
  add column if not exists publication_date timestamptz,
  add column if not exists publication_platform text,
  add column if not exists publication_due_date timestamptz,
  add column if not exists publication_confirmed_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 5. Tabela campaign_stage_schedule
-- -----------------------------------------------------------------------------

create table if not exists campaign_stage_schedule (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  stage               smallint not null check (stage between 0 and 8),
  due_date            date not null,
  original_due_date   date not null,
  extended_at         timestamptz,
  extended_by         uuid references profiles(id) on delete set null,
  extended_reason     text,
  completed_at        timestamptz,
  completed_by        uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (campaign_id, stage)
);

create index if not exists css_campaign_idx on campaign_stage_schedule(campaign_id);
create index if not exists css_due_idx      on campaign_stage_schedule(due_date)
  where completed_at is null;

drop trigger if exists campaign_stage_schedule_updated_at on campaign_stage_schedule;
create trigger campaign_stage_schedule_updated_at
  before update on campaign_stage_schedule
  for each row execute function set_updated_at();

alter table campaign_stage_schedule enable row level security;

drop policy if exists "schedule: read approved or admin" on campaign_stage_schedule;
create policy "schedule: read approved or admin"
  on campaign_stage_schedule for select
  to authenticated
  using (
    can_manage_campaign(campaign_id)
    or exists (
      select 1 from applications a
      where a.campaign_id = campaign_stage_schedule.campaign_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    )
  );

drop policy if exists "schedule: write campaign admin" on campaign_stage_schedule;
create policy "schedule: write campaign admin"
  on campaign_stage_schedule for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- -----------------------------------------------------------------------------
-- 6. Storage bucket campaign-briefings (privado)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('campaign-briefings', 'campaign-briefings', false)
  on conflict (id) do nothing;

drop policy if exists "briefings: approved or admin read" on storage.objects;
create policy "briefings: approved or admin read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'campaign-briefings'
    and (
      can_manage_campaign(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from applications a
        where a.campaign_id = ((storage.foldername(name))[1])::uuid
          and a.user_id = auth.uid()
          and a.status = 'approved'
      )
    )
  );

drop policy if exists "briefings: admin insert" on storage.objects;
create policy "briefings: admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campaign-briefings'
    and can_manage_campaign(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "briefings: admin update" on storage.objects;
create policy "briefings: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campaign-briefings'
    and can_manage_campaign(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'campaign-briefings'
    and can_manage_campaign(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "briefings: admin delete" on storage.objects;
create policy "briefings: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campaign-briefings'
    and can_manage_campaign(((storage.foldername(name))[1])::uuid)
  );

-- -----------------------------------------------------------------------------
-- 7. Trigger: edição de content_url em delivery 'needs_revision' volta para 'pending'
-- -----------------------------------------------------------------------------

create or replace function reset_deliverable_on_url_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Só reseta quando o PRÓPRIO criador (owner) mexe na URL pelo cliente.
  -- Admin via RPC SECURITY DEFINER tem auth.uid() != owner e mantém controle total.
  if auth.uid() is null or auth.uid() <> old.user_id then
    return new;
  end if;

  -- Quando criador atualiza content_url enquanto status='needs_revision',
  -- volta automaticamente para 'pending' para o admin re-analisar.
  if old.content_url is distinct from new.content_url
     and old.deliverable_status = 'needs_revision'
     and new.deliverable_status = 'needs_revision'
  then
    new.deliverable_status := 'pending';
    new.revision_note := null;
    new.revision_due_date := null;
  end if;

  -- Quando criador atualiza publication_url enquanto status='needs_resubmit',
  -- volta automaticamente para 'pending' para o admin re-confirmar.
  if old.publication_url is distinct from new.publication_url
     and old.publication_status = 'needs_resubmit'
     and new.publication_status = 'needs_resubmit'
  then
    new.publication_status := 'pending';
    new.publication_due_date := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reset_deliverable_on_url_change on campaign_deliveries;
create trigger trg_reset_deliverable_on_url_change
  before update on campaign_deliveries
  for each row
  execute function reset_deliverable_on_url_change();

-- -----------------------------------------------------------------------------
-- 7b. Trigger guard: criador (dono) só pode atualizar content_url e publication_url.
-- A policy RLS existente permite update por owner, mas não restringe colunas.
-- Este trigger reverte mudanças em campos admin-only quando o caller é o owner
-- sem permissão de admin. RPCs SECURITY DEFINER ainda funcionam porque rodam
-- com privilégios do definer.
-- Nome com prefixo 'a_' para rodar antes do trg_reset_deliverable_on_url_change.
-- -----------------------------------------------------------------------------

create or replace function a_guard_delivery_owner_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id = auth.uid() and not can_manage_campaign(new.campaign_id) then
    -- Imutáveis: identidade da row e datas de criação
    new.id                     := old.id;
    new.created_at             := old.created_at;
    new.campaign_id            := old.campaign_id;
    new.user_id                := old.user_id;
    new.index                  := old.index;
    -- Campos controlados pelo admin (apenas RPCs SECURITY DEFINER podem mexer)
    new.scheduled_date         := old.scheduled_date;
    new.deliverable_status     := old.deliverable_status;
    new.revision_note          := old.revision_note;
    new.revision_due_date      := old.revision_due_date;
    new.publication_status     := old.publication_status;
    new.publication_date       := old.publication_date;
    new.publication_platform   := old.publication_platform;
    new.publication_due_date   := old.publication_due_date;
    new.publication_confirmed_at := old.publication_confirmed_at;
    new.reviewed_at            := old.reviewed_at;
    new.reviewed_by            := old.reviewed_by;
    -- Permitido pelo criador: content_url, publication_url
  end if;
  return new;
end;
$$;

drop trigger if exists trg_a_guard_delivery_owner_fields on campaign_deliveries;
create trigger trg_a_guard_delivery_owner_fields
  before update on campaign_deliveries
  for each row
  execute function a_guard_delivery_owner_fields();

-- -----------------------------------------------------------------------------
-- 8. Helper interno: blockers por etapa (jsonb array)
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
      -- Saindo de 2 (briefing): texto OU arquivo
      select briefing, briefing_file_url into v_briefing, v_b_file
        from campaigns where id = p_campaign_id;
      if (v_briefing is null or length(trim(v_briefing)) = 0) and v_b_file is null then
        v_blockers := v_blockers || jsonb_build_array(
          jsonb_build_object('code','missing_briefing',
            'message','Adicione o briefing (texto ou arquivo).')
        );
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

-- -----------------------------------------------------------------------------
-- 9. RPC stage_readiness(campaign_id) — read-only
-- -----------------------------------------------------------------------------

create or replace function stage_readiness(p_campaign_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_current smallint;
  v_blockers jsonb;
  v_schedule jsonb;
  v_today date := current_date;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not can_manage_campaign(p_campaign_id) then raise exception 'not_authorized'; end if;

  select current_stage into v_current from campaigns where id = p_campaign_id;
  if v_current is null then raise exception 'campaign_not_found'; end if;

  if v_current < 8 then
    v_blockers := stage_blockers(p_campaign_id, (v_current + 1)::smallint);
  else
    v_blockers := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'stage', stage,
    'due_date', due_date,
    'original_due_date', original_due_date,
    'extended_at', extended_at,
    'extended_reason', extended_reason,
    'completed_at', completed_at,
    'status', case
      when completed_at is not null then 'done'
      when extended_at is not null then 'extended'
      when due_date < v_today then 'overdue'
      else 'on_track'
    end
  ) order by stage), '[]'::jsonb)
  into v_schedule
  from campaign_stage_schedule
  where campaign_id = p_campaign_id;

  return jsonb_build_object(
    'current_stage', v_current,
    'next_stage', case when v_current < 8 then v_current + 1 else null end,
    'ready', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'schedule', v_schedule
  );
end;
$$;

revoke all on function stage_readiness(uuid) from public;
grant execute on function stage_readiness(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. RPC complete_stage(campaign_id, stage, note?)
-- -----------------------------------------------------------------------------

create or replace function complete_stage(
  p_campaign_id uuid,
  p_stage smallint,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_current smallint;
  v_blockers jsonb;
  v_user uuid := auth.uid();
  v_new_status campaign_status;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not can_manage_campaign(p_campaign_id) then raise exception 'not_authorized'; end if;
  if p_stage < 0 or p_stage > 8 then raise exception 'invalid_stage'; end if;

  -- Lock pessimista para evitar race
  select current_stage into v_current from campaigns where id = p_campaign_id for update;
  if v_current is null then raise exception 'campaign_not_found'; end if;
  if v_current <> p_stage then raise exception 'stage_conflict'; end if;
  if v_current >= 8 then raise exception 'already_completed'; end if;

  -- Revalida readiness para a etapa que será CONCLUÍDA (não a próxima)
  v_blockers := stage_blockers(p_campaign_id, (p_stage + 1)::smallint);
  if jsonb_array_length(v_blockers) > 0 then
    raise exception 'stage_not_ready' using detail = v_blockers::text;
  end if;

  -- Marca schedule da etapa como concluída
  update campaign_stage_schedule
     set completed_at = now(),
         completed_by = v_user,
         updated_at = now()
   where campaign_id = p_campaign_id and stage = p_stage;

  -- Avança current_stage e espelha status legado
  v_new_status := case
    when p_stage + 1 = 8 then 'completed'::campaign_status
    when p_stage + 1 >= 1 then 'in_progress'::campaign_status
    else 'open'::campaign_status
  end;

  update campaigns
     set current_stage = (p_stage + 1)::smallint,
         status = v_new_status,
         stage_updated_at = now(),
         stage_history = stage_history || jsonb_build_array(
           jsonb_build_object(
             'action','completed',
             'stage', p_stage,
             'at', now(),
             'by', v_user,
             'note', p_note
           )
         )
   where id = p_campaign_id;

  -- Dispara notice opcional in-app
  if p_note is not null and length(trim(p_note)) > 0 then
    perform create_notice(p_campaign_id, p_note, true, null);
  end if;

  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'completed_stage', p_stage,
    'current_stage', (p_stage + 1)::smallint,
    'status', v_new_status
  );
end;
$$;

revoke all on function complete_stage(uuid, smallint, text) from public;
grant execute on function complete_stage(uuid, smallint, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. RPC revert_stage(campaign_id, reason) — master admin only
-- -----------------------------------------------------------------------------

create or replace function revert_stage(
  p_campaign_id uuid,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_current smallint;
  v_user uuid := auth.uid();
  v_target smallint;
  v_new_status campaign_status;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not is_master_admin() then raise exception 'not_authorized'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;

  select current_stage into v_current from campaigns where id = p_campaign_id for update;
  if v_current is null then raise exception 'campaign_not_found'; end if;
  if v_current = 0 then raise exception 'nothing_to_revert'; end if;

  v_target := (v_current - 1)::smallint;

  update campaign_stage_schedule
     set completed_at = null,
         completed_by = null,
         updated_at = now()
   where campaign_id = p_campaign_id and stage = v_target;

  v_new_status := case
    when v_target >= 1 then 'in_progress'::campaign_status
    else 'open'::campaign_status
  end;

  update campaigns
     set current_stage = v_target,
         status = v_new_status,
         stage_updated_at = now(),
         stage_history = stage_history || jsonb_build_array(
           jsonb_build_object(
             'action','reverted',
             'from_stage', v_current,
             'to_stage', v_target,
             'at', now(),
             'by', v_user,
             'reason', p_reason
           )
         )
   where id = p_campaign_id;

  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'current_stage', v_target,
    'status', v_new_status
  );
end;
$$;

revoke all on function revert_stage(uuid, text) from public;
grant execute on function revert_stage(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 12. RPC set_stage_deadline(campaign_id, stage, due_date, reason?)
--     - Primeira chamada (sem linha existente): cria com original_due_date = due_date.
--     - Chamadas subsequentes: atualizam due_date + marcam extended_at/by/reason.
-- -----------------------------------------------------------------------------

create or replace function set_stage_deadline(
  p_campaign_id uuid,
  p_stage smallint,
  p_due_date date,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing campaign_stage_schedule%rowtype;
  v_status text;
  v_today date := current_date;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not can_manage_campaign(p_campaign_id) then raise exception 'not_authorized'; end if;
  if p_stage < 0 or p_stage > 8 then raise exception 'invalid_stage'; end if;
  if p_due_date is null then raise exception 'due_date_required'; end if;
  if p_due_date < v_today then raise exception 'due_date_in_past'; end if;

  select * into v_existing
    from campaign_stage_schedule
   where campaign_id = p_campaign_id and stage = p_stage
   for update;

  if not found then
    insert into campaign_stage_schedule
      (campaign_id, stage, due_date, original_due_date)
      values (p_campaign_id, p_stage, p_due_date, p_due_date);
  else
    if v_existing.completed_at is not null then
      raise exception 'stage_already_completed';
    end if;
    -- Se a data nova é igual à atual e não é extensão, no-op
    if v_existing.due_date = p_due_date and v_existing.extended_at is null then
      return jsonb_build_object('changed', false, 'stage', p_stage, 'due_date', p_due_date);
    end if;
    update campaign_stage_schedule
       set due_date = p_due_date,
           extended_at = now(),
           extended_by = v_user,
           extended_reason = coalesce(nullif(trim(p_reason), ''), v_existing.extended_reason),
           updated_at = now()
     where id = v_existing.id;
  end if;

  select case
    when completed_at is not null then 'done'
    when extended_at is not null then 'extended'
    when due_date < v_today then 'overdue'
    else 'on_track'
  end into v_status
  from campaign_stage_schedule
  where campaign_id = p_campaign_id and stage = p_stage;

  return jsonb_build_object(
    'changed', true,
    'stage', p_stage,
    'due_date', p_due_date,
    'status', v_status
  );
end;
$$;

revoke all on function set_stage_deadline(uuid, smallint, date, text) from public;
grant execute on function set_stage_deadline(uuid, smallint, date, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 13. RPC init_campaign_schedule(campaign_id, dates[9])
-- -----------------------------------------------------------------------------

create or replace function init_campaign_schedule(
  p_campaign_id uuid,
  p_dates date[]
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  i int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not can_manage_campaign(p_campaign_id) then raise exception 'not_authorized'; end if;
  -- coalesce evita NULL quando array é vazio ([] tem array_length=NULL no PG)
  if p_dates is null or coalesce(array_length(p_dates, 1), 0) <> 9 then
    raise exception 'invalid_dates_length';
  end if;

  for i in 1..9 loop
    if p_dates[i] is null then raise exception 'missing_date' using detail = 'stage ' || (i-1); end if;
    insert into campaign_stage_schedule
      (campaign_id, stage, due_date, original_due_date)
    values
      (p_campaign_id, (i-1)::smallint, p_dates[i], p_dates[i])
    on conflict (campaign_id, stage) do nothing;
  end loop;
end;
$$;

revoke all on function init_campaign_schedule(uuid, date[]) from public;
grant execute on function init_campaign_schedule(uuid, date[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 14. RPC mark_joined_group(application_id, joined)
-- -----------------------------------------------------------------------------

create or replace function mark_joined_group(
  p_application_id uuid,
  p_joined boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_app applications%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_app from applications where id = p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if not can_manage_campaign(v_app.campaign_id) then raise exception 'not_authorized'; end if;
  if v_app.status <> 'approved' then raise exception 'not_approved'; end if;
  if v_app.disqualified_at is not null then raise exception 'already_disqualified'; end if;

  -- trigger applications_updated_at cuida do updated_at automaticamente
  update applications
     set joined_whatsapp_group = p_joined,
         joined_at = case when p_joined then now() else null end
   where id = p_application_id;

  return jsonb_build_object('application_id', p_application_id, 'joined', p_joined);
end;
$$;

revoke all on function mark_joined_group(uuid, boolean) from public;
grant execute on function mark_joined_group(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 15. RPC set_deliverable_status(delivery_id, status, note?, due?)
-- -----------------------------------------------------------------------------

create or replace function set_deliverable_status(
  p_delivery_id uuid,
  p_status deliverable_status,
  p_note text default null,
  p_due timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_d campaign_deliveries%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  if p_status = 'needs_revision' then
    if p_note is null or length(trim(p_note)) < 5 then raise exception 'note_required'; end if;
    if length(p_note) > 2000 then raise exception 'note_too_long'; end if;
    if p_due is null or p_due <= now() then raise exception 'due_date_invalid'; end if;
  end if;

  update campaign_deliveries
     set deliverable_status = p_status,
         revision_note = case when p_status = 'needs_revision' then p_note else null end,
         revision_due_date = case when p_status = 'needs_revision' then p_due else null end,
         reviewed_at = now(),
         reviewed_by = v_user
   where id = p_delivery_id;

  -- Quando aprova e há revisões, marca a última (com URL enviada) como aprovada.
  -- Quando aprova sem revisões, a aprovação refere-se à entrega original (content_url).
  if p_status = 'approved' then
    update campaign_delivery_revisions
       set approved_at = now()
     where id = (
       select id from campaign_delivery_revisions
        where delivery_id = p_delivery_id and revised_url is not null
        order by round desc
        limit 1
     );
  end if;

  return jsonb_build_object('delivery_id', p_delivery_id, 'status', p_status);
end;
$$;

revoke all on function set_deliverable_status(uuid, deliverable_status, text, timestamptz) from public;
grant execute on function set_deliverable_status(uuid, deliverable_status, text, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- 16. RPC set_publication_schedule(delivery_id, date, platform)
-- -----------------------------------------------------------------------------

create or replace function set_publication_schedule(
  p_delivery_id uuid,
  p_date timestamptz,
  p_platform text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_d campaign_deliveries%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_date is null then raise exception 'date_required'; end if;
  if p_platform is null or length(trim(p_platform)) = 0 then raise exception 'platform_required'; end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if v_d.deliverable_status <> 'approved' then raise exception 'deliverable_not_approved'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  update campaign_deliveries
     set publication_date = p_date,
         publication_platform = trim(p_platform)
   where id = p_delivery_id;

  return jsonb_build_object(
    'delivery_id', p_delivery_id,
    'publication_date', p_date,
    'publication_platform', trim(p_platform)
  );
end;
$$;

revoke all on function set_publication_schedule(uuid, timestamptz, text) from public;
grant execute on function set_publication_schedule(uuid, timestamptz, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 17. RPC set_publication_status(delivery_id, status, due?)
-- -----------------------------------------------------------------------------

create or replace function set_publication_status(
  p_delivery_id uuid,
  p_status publication_status,
  p_due timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_d campaign_deliveries%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  if p_status = 'needs_resubmit' then
    if p_due is null or p_due <= now() then raise exception 'due_date_invalid'; end if;
  end if;

  update campaign_deliveries
     set publication_status = p_status,
         publication_due_date = case
           when p_status = 'needs_resubmit' then p_due
           when p_status = 'confirmed' then null
           else publication_due_date
         end,
         publication_confirmed_at = case
           when p_status = 'confirmed' then now()
           else null
         end
   where id = p_delivery_id;

  return jsonb_build_object('delivery_id', p_delivery_id, 'status', p_status);
end;
$$;

revoke all on function set_publication_status(uuid, publication_status, timestamptz) from public;
grant execute on function set_publication_status(uuid, publication_status, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- 18. RPC disqualify_participant(application_id, reason)
-- -----------------------------------------------------------------------------

create or replace function disqualify_participant(
  p_application_id uuid,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_app applications%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if length(p_reason) > 500 then raise exception 'reason_too_long'; end if;

  select * into v_app from applications where id = p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if not can_manage_campaign(v_app.campaign_id) then raise exception 'not_authorized'; end if;

  update applications
     set disqualified_at = now(),
         disqualification_reason = trim(p_reason)
   where id = p_application_id;

  -- Notice direcionada ao usuário desclassificado
  perform create_notice(
    v_app.campaign_id,
    'Sua participação na campanha foi encerrada. Motivo: ' || trim(p_reason),
    false,
    array[v_app.user_id]::uuid[]
  );

  return jsonb_build_object('application_id', p_application_id, 'disqualified_at', now());
end;
$$;

revoke all on function disqualify_participant(uuid, text) from public;
grant execute on function disqualify_participant(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 19. Backfill — campanhas existentes
-- -----------------------------------------------------------------------------

-- current_stage derivado de status
update campaigns
   set current_stage = case status
     when 'completed'   then 8
     when 'in_progress' then 3
     else 0
   end
 where current_stage = 0;

-- Deliverable status NÃO é inferido pelo content_url. Mesmo deliveries antigos
-- (de campanhas em andamento) começam como 'pending' para forçar revisão manual
-- do admin. Sem isso, admin não consegue solicitar correção de entregáveis
-- pré-existentes (UI só mostra "Pedir correção" quando status != 'approved').

-- Cria schedule default para campanhas legadas
insert into campaign_stage_schedule
  (campaign_id, stage, due_date, original_due_date, completed_at)
select c.id,
       gs.stage::smallint,
       coalesce(c.deadline::date, current_date + interval '30 days')::date,
       coalesce(c.deadline::date, current_date + interval '30 days')::date,
       case when gs.stage < c.current_stage then now() end
from campaigns c
cross join generate_series(0, 8) as gs(stage)
on conflict (campaign_id, stage) do nothing;
