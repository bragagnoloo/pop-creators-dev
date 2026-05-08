-- =============================================================================
-- 0014 — Admin permissions: campaign_admin role + granular access per campaign
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add campaign_admin to user_role enum
-- -----------------------------------------------------------------------------

alter type user_role add value if not exists 'campaign_admin';

-- -----------------------------------------------------------------------------
-- 2. admin_campaign_assignments — mapa admin → campanhas atribuídas
-- -----------------------------------------------------------------------------

create table if not exists admin_campaign_assignments (
  admin_id    uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references profiles(id),
  primary key (admin_id, campaign_id)
);

create index if not exists aca_admin_idx    on admin_campaign_assignments(admin_id);
create index if not exists aca_campaign_idx on admin_campaign_assignments(campaign_id);

alter table admin_campaign_assignments enable row level security;

-- -----------------------------------------------------------------------------
-- 3. Helper SQL functions
-- -----------------------------------------------------------------------------

-- Apenas master admin (role = 'admin')
create or replace function is_master_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

-- Qualquer admin (master ou campaign)
create or replace function is_any_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('admin', 'campaign_admin') from profiles where id = auth.uid()),
    false
  );
$$;

-- Master admin OU campaign admin com atribuição para essa campanha específica
create or replace function can_manage_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select
      role = 'admin'
      or (
        role = 'campaign_admin'
        and exists (
          select 1 from admin_campaign_assignments
          where admin_id = auth.uid()
            and campaign_id = p_campaign_id
        )
      )
    from profiles where id = auth.uid()),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. RLS para admin_campaign_assignments
-- -----------------------------------------------------------------------------

create policy "aca: master admin full"
  on admin_campaign_assignments for all
  to authenticated
  using (is_master_admin())
  with check (is_master_admin());

create policy "aca: campaign admin reads own"
  on admin_campaign_assignments for select
  to authenticated
  using (admin_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Atualizar RLS das tabelas existentes
-- -----------------------------------------------------------------------------

-- campaigns: separar o "all" em insert/update/delete com diferentes regras
drop policy if exists "campaigns: admin writes" on campaigns;

create policy "campaigns: master admin insert"
  on campaigns for insert
  to authenticated
  with check (is_master_admin());

create policy "campaigns: master admin delete"
  on campaigns for delete
  to authenticated
  using (is_master_admin());

create policy "campaigns: admin or assigned update"
  on campaigns for update
  to authenticated
  using (can_manage_campaign(id))
  with check (can_manage_campaign(id));

-- applications: extender leitura para qualquer admin; escrita para admin da campanha
drop policy if exists "applications: user reads own" on applications;
create policy "applications: user reads own"
  on applications for select
  to authenticated
  using (user_id = auth.uid() or is_any_admin());

drop policy if exists "applications: admin updates any" on applications;
create policy "applications: admin updates any"
  on applications for update
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

drop policy if exists "applications: admin deletes" on applications;
create policy "applications: admin deletes"
  on applications for delete
  to authenticated
  using (can_manage_campaign(campaign_id));

-- campaign_deliveries: extender para admin da campanha
drop policy if exists "deliveries: read own or admin" on campaign_deliveries;
create policy "deliveries: read own or admin"
  on campaign_deliveries for select
  to authenticated
  using (user_id = auth.uid() or can_manage_campaign(campaign_id));

drop policy if exists "deliveries: admin full" on campaign_deliveries;
create policy "deliveries: admin full"
  on campaign_deliveries for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- balance_credits: extender para admin da campanha
drop policy if exists "credits: user reads own" on balance_credits;
create policy "credits: user reads own"
  on balance_credits for select
  to authenticated
  using (user_id = auth.uid() or can_manage_campaign(campaign_id));

drop policy if exists "credits: admin writes" on balance_credits;
create policy "credits: admin writes"
  on balance_credits for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- campaign_notices: leitura para qualquer admin; escrita para admin da campanha
drop policy if exists "notices: user reads relevant" on campaign_notices;
create policy "notices: user reads relevant"
  on campaign_notices for select
  to authenticated
  using (
    is_any_admin()
    or (
      exists (
        select 1 from applications a
        where a.campaign_id = campaign_notices.campaign_id
          and a.user_id = auth.uid()
          and a.status = 'approved'
      )
      and (
        is_general
        or exists (
          select 1 from campaign_notice_recipients r
          where r.notice_id = campaign_notices.id
            and r.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "notices: admin writes" on campaign_notices;
create policy "notices: admin writes"
  on campaign_notices for all
  to authenticated
  using (can_manage_campaign(campaign_id))
  with check (can_manage_campaign(campaign_id));

-- notice_recipients: qualquer admin pode ler; escrita via can_manage_campaign
drop policy if exists "notice_recipients: user reads own" on campaign_notice_recipients;
create policy "notice_recipients: user reads own"
  on campaign_notice_recipients for select
  to authenticated
  using (user_id = auth.uid() or is_any_admin());

drop policy if exists "notice_recipients: admin writes" on campaign_notice_recipients;
create policy "notice_recipients: admin writes"
  on campaign_notice_recipients for all
  to authenticated
  using (is_any_admin())
  with check (is_any_admin());

-- notice_reads: qualquer admin pode ler
drop policy if exists "notice_reads: user reads own" on campaign_notice_reads;
create policy "notice_reads: user reads own"
  on campaign_notice_reads for select
  to authenticated
  using (user_id = auth.uid() or is_any_admin());

-- -----------------------------------------------------------------------------
-- 6. Atualizar create_notice para suportar campaign admins
-- -----------------------------------------------------------------------------

create or replace function create_notice(
  p_campaign_id uuid,
  p_content text,
  p_is_general boolean,
  p_recipient_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_notice_id uuid;
  v_author uuid := auth.uid();
begin
  if v_author is null then
    raise exception 'not_authenticated';
  end if;
  if p_campaign_id is null then
    raise exception 'missing_campaign';
  end if;
  if not can_manage_campaign(p_campaign_id) then
    raise exception 'not_authorized';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'empty_content';
  end if;

  insert into campaign_notices (campaign_id, author_id, content, is_general)
  values (p_campaign_id, v_author, p_content, p_is_general)
  returning id into v_notice_id;

  if not p_is_general and p_recipient_ids is not null and array_length(p_recipient_ids, 1) > 0 then
    insert into campaign_notice_recipients (notice_id, user_id)
    select v_notice_id, unnest(p_recipient_ids)
    on conflict do nothing;
  end if;

  return v_notice_id;
end;
$$;

revoke all on function create_notice(uuid, text, boolean, uuid[]) from public;
grant execute on function create_notice(uuid, text, boolean, uuid[]) to authenticated;
