-- =============================================================================
-- 0016 — Histórico de revisões de entregáveis (correção 01, 02, 03...)
-- =============================================================================
-- Cada vez que admin pede correção na Etapa 04, cria-se uma linha aqui.
-- Criador atualiza revised_url; ao salvar URL, delivery.status volta pra
-- 'pending' para o admin reanalisar.

-- -----------------------------------------------------------------------------
-- 1. Tabela
-- -----------------------------------------------------------------------------

create table if not exists campaign_delivery_revisions (
  id            uuid primary key default gen_random_uuid(),
  delivery_id   uuid not null references campaign_deliveries(id) on delete cascade,
  round         smallint not null check (round >= 1),
  note          text not null,
  due_date      timestamptz not null,
  revised_url   text,
  revised_at    timestamptz,
  approved_at   timestamptz,
  requested_at  timestamptz not null default now(),
  requested_by  uuid references profiles(id) on delete set null,
  unique (delivery_id, round)
);

-- Caso a migration seja re-aplicada num banco que já tem a tabela mas sem approved_at
alter table campaign_delivery_revisions add column if not exists approved_at timestamptz;

create index if not exists cdr_delivery_idx on campaign_delivery_revisions(delivery_id);

alter table campaign_delivery_revisions enable row level security;

drop policy if exists "revisions: read own or admin" on campaign_delivery_revisions;
create policy "revisions: read own or admin"
  on campaign_delivery_revisions for select
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_delivery_revisions.delivery_id
        and (d.user_id = auth.uid() or can_manage_campaign(d.campaign_id))
    )
  );

drop policy if exists "revisions: owner updates url" on campaign_delivery_revisions;
create policy "revisions: owner updates url"
  on campaign_delivery_revisions for update
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_delivery_revisions.delivery_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_delivery_revisions.delivery_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "revisions: admin full" on campaign_delivery_revisions;
create policy "revisions: admin full"
  on campaign_delivery_revisions for all
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_delivery_revisions.delivery_id
        and can_manage_campaign(d.campaign_id)
    )
  )
  with check (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_delivery_revisions.delivery_id
        and can_manage_campaign(d.campaign_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Trigger guard: criador só pode atualizar revised_url e revised_at
-- -----------------------------------------------------------------------------

create or replace function a_guard_revision_owner_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_campaign_id uuid;
begin
  select d.user_id, d.campaign_id into v_owner, v_campaign_id
  from campaign_deliveries d where d.id = new.delivery_id;

  if auth.uid() = v_owner and not can_manage_campaign(v_campaign_id) then
    new.id           := old.id;
    new.delivery_id  := old.delivery_id;
    new.round        := old.round;
    new.note         := old.note;
    new.due_date     := old.due_date;
    new.requested_at := old.requested_at;
    new.requested_by := old.requested_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_a_guard_revision_owner_fields on campaign_delivery_revisions;
create trigger trg_a_guard_revision_owner_fields
  before update on campaign_delivery_revisions
  for each row
  execute function a_guard_revision_owner_fields();

-- -----------------------------------------------------------------------------
-- 3. Trigger: quando criador atualiza revised_url, delivery volta pra 'pending'
-- -----------------------------------------------------------------------------

create or replace function reset_delivery_on_revision_url_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  -- Só dispara quando o owner mexeu (caller é o próprio criador)
  select d.user_id into v_owner from campaign_deliveries d where d.id = new.delivery_id;
  if auth.uid() is null or auth.uid() <> v_owner then return new; end if;

  -- Mudou a URL e ela está preenchida agora → reset
  if old.revised_url is distinct from new.revised_url and new.revised_url is not null then
    new.revised_at := now();
    update campaign_deliveries
       set deliverable_status = 'pending',
           revision_note      = null,
           revision_due_date  = null
     where id = new.delivery_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_delivery_on_revision_url_change on campaign_delivery_revisions;
create trigger trg_reset_delivery_on_revision_url_change
  before update on campaign_delivery_revisions
  for each row
  execute function reset_delivery_on_revision_url_change();

-- -----------------------------------------------------------------------------
-- 4. RPC: admin solicita correção (cria nova revision)
-- -----------------------------------------------------------------------------

create or replace function request_delivery_revision(
  p_delivery_id uuid,
  p_note text,
  p_due timestamptz
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_d campaign_deliveries%rowtype;
  v_round smallint;
  v_revision_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_note is null or length(trim(p_note)) < 5 then raise exception 'note_required'; end if;
  if length(p_note) > 2000 then raise exception 'note_too_long'; end if;
  if p_due is null or p_due <= now() then raise exception 'due_date_invalid'; end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  -- Próximo round
  select coalesce(max(round), 0) + 1 into v_round
    from campaign_delivery_revisions
   where delivery_id = p_delivery_id;

  insert into campaign_delivery_revisions
    (delivery_id, round, note, due_date, requested_by)
  values
    (p_delivery_id, v_round, trim(p_note), p_due, v_user)
  returning id into v_revision_id;

  -- Espelha na delivery para a UI do criador mostrar a nota corrente direto
  update campaign_deliveries
     set deliverable_status = 'needs_revision',
         revision_note      = trim(p_note),
         revision_due_date  = p_due,
         reviewed_at        = now(),
         reviewed_by        = v_user
   where id = p_delivery_id;

  return jsonb_build_object(
    'delivery_id', p_delivery_id,
    'revision_id', v_revision_id,
    'round', v_round
  );
end;
$$;

revoke all on function request_delivery_revision(uuid, text, timestamptz) from public;
grant execute on function request_delivery_revision(uuid, text, timestamptz) to authenticated;
