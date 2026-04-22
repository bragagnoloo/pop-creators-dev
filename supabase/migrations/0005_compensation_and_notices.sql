-- =============================================================================
-- 0005 — Compensação múltipla, avisos por campanha, aceite do termo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Compensação múltipla em campaigns
-- -----------------------------------------------------------------------------

alter table campaigns
  add column if not exists has_cache boolean not null default true,
  add column if not exists has_permuta boolean not null default false,
  add column if not exists permuta_description text,
  add column if not exists has_commission boolean not null default false,
  add column if not exists commission_percentage numeric(5, 2)
    check (commission_percentage is null or (commission_percentage >= 0 and commission_percentage <= 100)),
  add column if not exists commission_description text;

-- Backfill: campanhas existentes tinham apenas cachê numérico → marca has_cache
-- conforme o valor atual. Se cache=0 ou null, assume has_cache=true pra não
-- violar a constraint (admin pode ajustar depois).
update campaigns
  set has_cache = true
  where has_cache is null;

-- Constraint: pelo menos um tipo de compensação deve estar ativo.
-- Drop e recria idempotentemente pra permitir re-runs.
alter table campaigns drop constraint if exists campaigns_has_compensation;
alter table campaigns add constraint campaigns_has_compensation
  check (has_cache or has_permuta or has_commission);

-- -----------------------------------------------------------------------------
-- 2) Avisos por campanha
-- -----------------------------------------------------------------------------

create table if not exists campaign_notices (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null check (length(trim(content)) > 0),
  is_general boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists campaign_notices_campaign_idx
  on campaign_notices(campaign_id, created_at desc);

create table if not exists campaign_notice_recipients (
  notice_id uuid not null references campaign_notices(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (notice_id, user_id)
);

create index if not exists campaign_notice_recipients_user_idx
  on campaign_notice_recipients(user_id);

create table if not exists campaign_notice_reads (
  notice_id uuid not null references campaign_notices(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

create index if not exists campaign_notice_reads_user_idx
  on campaign_notice_reads(user_id);

alter table campaign_notices enable row level security;
alter table campaign_notice_recipients enable row level security;
alter table campaign_notice_reads enable row level security;

-- notices: user lê se é admin OU (está approved na campanha E (is_general OU está em recipients))
drop policy if exists "notices: user reads relevant" on campaign_notices;
create policy "notices: user reads relevant"
  on campaign_notices for select
  to authenticated
  using (
    is_admin()
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
  using (is_admin())
  with check (is_admin());

-- recipients: user lê os próprios; admin full
drop policy if exists "notice_recipients: user reads own" on campaign_notice_recipients;
create policy "notice_recipients: user reads own"
  on campaign_notice_recipients for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists "notice_recipients: admin writes" on campaign_notice_recipients;
create policy "notice_recipients: admin writes"
  on campaign_notice_recipients for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- reads: user lê as próprias; admin lê tudo; user insere as próprias
drop policy if exists "notice_reads: user reads own" on campaign_notice_reads;
create policy "notice_reads: user reads own"
  on campaign_notice_reads for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists "notice_reads: user marks own" on campaign_notice_reads;
create policy "notice_reads: user marks own"
  on campaign_notice_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- Bypass ao admin para COUNT agregado dos reads de cada notice (rollup na UI admin)
-- admin já tem via policy acima.

-- -----------------------------------------------------------------------------
-- 3) RPC atômica: create_notice
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
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  if p_campaign_id is null then
    raise exception 'missing_campaign';
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

-- -----------------------------------------------------------------------------
-- 4) Aceite do termo (LGPD)
-- -----------------------------------------------------------------------------

create table if not exists campaign_term_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  term_version text not null default 'v1',
  accepted_at timestamptz not null default now(),
  user_agent text,
  unique (user_id, campaign_id, term_version)
);

create index if not exists campaign_term_acceptances_user_idx
  on campaign_term_acceptances(user_id);

alter table campaign_term_acceptances enable row level security;

drop policy if exists "term_acceptances: user reads own" on campaign_term_acceptances;
create policy "term_acceptances: user reads own"
  on campaign_term_acceptances for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- Não criamos policy de INSERT para usuário — registro sempre via RPC apply_with_term (SECURITY DEFINER).

-- -----------------------------------------------------------------------------
-- 5) RPC atômica: apply_with_term — candidatura + registro do termo
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
