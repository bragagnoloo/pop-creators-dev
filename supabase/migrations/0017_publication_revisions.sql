-- =============================================================================
-- 0017 — Histórico de reenvios de publicação (reenvio 01, 02, 03...)
-- =============================================================================
-- Mesma lógica do 0016 (revisões de entregável), mas para a Etapa 06.
-- Cada vez que admin clica "Pedir reenvio", cria-se uma linha aqui com a
-- nova data limite. Criador preenche revised_urls (por plataforma).

create table if not exists campaign_publication_revisions (
  id            uuid primary key default gen_random_uuid(),
  delivery_id   uuid not null references campaign_deliveries(id) on delete cascade,
  round         smallint not null check (round >= 1),
  note          text,
  due_date      timestamptz not null,
  revised_urls  jsonb not null default '{}'::jsonb,
  revised_at    timestamptz,
  approved_at   timestamptz,
  requested_at  timestamptz not null default now(),
  requested_by  uuid references profiles(id) on delete set null,
  unique (delivery_id, round)
);

create index if not exists cpr_delivery_idx on campaign_publication_revisions(delivery_id);

alter table campaign_publication_revisions enable row level security;

drop policy if exists "pub_revisions: read own or admin" on campaign_publication_revisions;
create policy "pub_revisions: read own or admin"
  on campaign_publication_revisions for select
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_publication_revisions.delivery_id
        and (d.user_id = auth.uid() or can_manage_campaign(d.campaign_id))
    )
  );

drop policy if exists "pub_revisions: owner updates urls" on campaign_publication_revisions;
create policy "pub_revisions: owner updates urls"
  on campaign_publication_revisions for update
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_publication_revisions.delivery_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_publication_revisions.delivery_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "pub_revisions: admin full" on campaign_publication_revisions;
create policy "pub_revisions: admin full"
  on campaign_publication_revisions for all
  to authenticated
  using (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_publication_revisions.delivery_id
        and can_manage_campaign(d.campaign_id)
    )
  )
  with check (
    exists (
      select 1 from campaign_deliveries d
      where d.id = campaign_publication_revisions.delivery_id
        and can_manage_campaign(d.campaign_id)
    )
  );

-- Trigger guard: criador só pode atualizar revised_urls e revised_at
create or replace function a_guard_pub_revision_owner_fields()
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
    new.approved_at  := old.approved_at;
    new.requested_at := old.requested_at;
    new.requested_by := old.requested_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_a_guard_pub_revision_owner_fields on campaign_publication_revisions;
create trigger trg_a_guard_pub_revision_owner_fields
  before update on campaign_publication_revisions
  for each row
  execute function a_guard_pub_revision_owner_fields();

-- Trigger: quando criador atualiza revised_urls e há pelo menos 1 URL,
-- delivery volta para 'pending' (admin reanalisa).
create or replace function reset_delivery_on_pub_revision_url_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_has_url boolean;
begin
  select d.user_id into v_owner from campaign_deliveries d where d.id = new.delivery_id;
  if auth.uid() is null or auth.uid() <> v_owner then return new; end if;

  v_has_url := jsonb_typeof(new.revised_urls) = 'object'
    and exists (
      select 1 from jsonb_each_text(new.revised_urls)
      where length(trim(value)) > 0
    );

  if old.revised_urls::text is distinct from new.revised_urls::text and v_has_url then
    new.revised_at := now();
    -- Espelha as URLs revisadas em campaign_deliveries.publication_urls
    update campaign_deliveries
       set publication_urls    = new.revised_urls,
           publication_status  = 'pending',
           publication_due_date = null
     where id = new.delivery_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_delivery_on_pub_revision_url_change on campaign_publication_revisions;
create trigger trg_reset_delivery_on_pub_revision_url_change
  before update on campaign_publication_revisions
  for each row
  execute function reset_delivery_on_pub_revision_url_change();

-- RPC: admin solicita reenvio (cria nova publication_revision)
create or replace function request_publication_revision(
  p_delivery_id uuid,
  p_due timestamptz,
  p_note text default null
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
  if p_due is null or p_due <= now() then raise exception 'due_date_invalid'; end if;
  if p_note is not null and length(p_note) > 2000 then raise exception 'note_too_long'; end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  select coalesce(max(round), 0) + 1 into v_round
    from campaign_publication_revisions
   where delivery_id = p_delivery_id;

  insert into campaign_publication_revisions
    (delivery_id, round, note, due_date, requested_by)
  values
    (p_delivery_id, v_round, nullif(trim(p_note), ''), p_due, v_user)
  returning id into v_revision_id;

  update campaign_deliveries
     set publication_status   = 'needs_resubmit',
         publication_due_date = p_due
   where id = p_delivery_id;

  return jsonb_build_object(
    'delivery_id', p_delivery_id,
    'revision_id', v_revision_id,
    'round', v_round
  );
end;
$$;

revoke all on function request_publication_revision(uuid, timestamptz, text) from public;
grant execute on function request_publication_revision(uuid, timestamptz, text) to authenticated;

-- Atualiza set_publication_status: quando admin confirma, marca a última revisão
-- (com revised_urls preenchidas) como approved_at = now(). Igual ao padrão da
-- Etapa 04.
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

  if p_status = 'confirmed' then
    update campaign_publication_revisions
       set approved_at = now()
     where id = (
       select id from campaign_publication_revisions
        where delivery_id = p_delivery_id and revised_urls <> '{}'::jsonb
        order by round desc
        limit 1
     );
  end if;

  return jsonb_build_object('delivery_id', p_delivery_id, 'status', p_status);
end;
$$;
