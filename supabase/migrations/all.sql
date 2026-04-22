-- =============================================================================
-- POPline Creators — Initial Schema
-- =============================================================================

-- Extensions -----------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------

create type user_role as enum ('creator', 'admin');
create type pix_key_type as enum ('cpf', 'cnpj', 'email', 'phone', 'random');
create type campaign_status as enum ('open', 'in_progress', 'completed');
create type application_status as enum ('pending', 'approved', 'rejected');
create type credit_status as enum ('processing', 'available', 'withdrawn');
create type withdrawal_status as enum ('requested', 'paid');
create type plan_id as enum ('free', 'monthly', 'semester', 'yearly');
create type subscription_source as enum ('system', 'admin');

-- Utility trigger: updated_at ------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles (1:1 com auth.users)
-- =============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role user_role not null default 'creator',
  full_name text default '',
  whatsapp text default '',
  photo_url text,
  bio text default '',
  instagram text default '',
  instagram_followers text default '',
  tiktok text default '',
  tiktok_followers text default '',
  cep text default '',
  state text default '',
  city text default '',
  neighborhood text default '',
  address text default '',
  onboarding_complete boolean not null default false,
  pix_key text,
  pix_key_type pix_key_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile when auth.users is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is current user admin? ---------------------------------------------

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

-- =============================================================================
-- campaigns
-- =============================================================================

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status campaign_status not null default 'open',
  deadline timestamptz,
  image_url text,
  briefing text,
  cache numeric(12, 2) not null default 0,
  delivery_count integer not null default 1 check (delivery_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

create index campaigns_status_idx on campaigns(status);
create index campaigns_created_at_idx on campaigns(created_at desc);

-- =============================================================================
-- applications
-- =============================================================================

create table applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status application_status not null default 'pending',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create trigger applications_updated_at before update on applications
  for each row execute function set_updated_at();

create index applications_user_idx on applications(user_id);
create index applications_campaign_idx on applications(campaign_id);

-- =============================================================================
-- campaign_deliveries
-- =============================================================================

create table campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  index integer not null check (index >= 1),
  scheduled_date timestamptz,
  content_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id, index)
);

create trigger campaign_deliveries_updated_at before update on campaign_deliveries
  for each row execute function set_updated_at();

create index campaign_deliveries_user_campaign_idx on campaign_deliveries(user_id, campaign_id);

-- =============================================================================
-- balance_credits
-- =============================================================================

create table balance_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status credit_status not null default 'processing',
  consumed_amount numeric(12, 2) not null default 0 check (consumed_amount >= 0),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  unique (user_id, campaign_id)
);

create index balance_credits_user_idx on balance_credits(user_id);
create index balance_credits_campaign_idx on balance_credits(campaign_id);

-- =============================================================================
-- withdrawals
-- =============================================================================

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  pix_key text not null,
  pix_key_type pix_key_type not null,
  status withdrawal_status not null default 'requested',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  consumed_credits jsonb not null default '[]'::jsonb
);

create index withdrawals_user_idx on withdrawals(user_id);
create index withdrawals_status_idx on withdrawals(status);

-- =============================================================================
-- subscriptions (1:1 com profiles)
-- =============================================================================

create table subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan plan_id not null default 'free',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  assigned_by subscription_source not null default 'system',
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- =============================================================================
-- lessons
-- =============================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  thumbnail_url text,
  youtube_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lessons_updated_at before update on lessons
  for each row execute function set_updated_at();

create index lessons_created_at_idx on lessons(created_at desc);

-- lesson_ratings

create table lesson_ratings (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger lesson_ratings_updated_at before update on lesson_ratings
  for each row execute function set_updated_at();

-- lesson_comments

create table lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null check (length(content) > 0),
  created_at timestamptz not null default now()
);

create index lesson_comments_lesson_idx on lesson_comments(lesson_id, created_at desc);

-- watched_lessons

create table watched_lessons (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- =============================================================================
-- saved_scripts
-- =============================================================================

create table saved_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  inputs jsonb not null default '{}'::jsonb,
  variation jsonb not null default '{}'::jsonb,
  refinement_level integer not null default 0,
  created_at timestamptz not null default now()
);

create index saved_scripts_user_idx on saved_scripts(user_id, created_at desc);
-- =============================================================================
-- Row Level Security — policies por tabela
-- =============================================================================

alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table applications enable row level security;
alter table campaign_deliveries enable row level security;
alter table balance_credits enable row level security;
alter table withdrawals enable row level security;
alter table subscriptions enable row level security;
alter table lessons enable row level security;
alter table lesson_ratings enable row level security;
alter table lesson_comments enable row level security;
alter table watched_lessons enable row level security;
alter table saved_scripts enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create policy "profiles: users read any authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: user updates own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin updates any"
  on profiles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- INSERT é feito pelo trigger handle_new_user (security definer), sem policy

-- -----------------------------------------------------------------------------
-- campaigns (todos autenticados leem; só admin escreve)
-- -----------------------------------------------------------------------------

create policy "campaigns: read authenticated"
  on campaigns for select
  to authenticated
  using (true);

create policy "campaigns: admin writes"
  on campaigns for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- applications
-- -----------------------------------------------------------------------------

create policy "applications: user reads own"
  on applications for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "applications: user creates own (pending)"
  on applications for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "applications: admin updates any"
  on applications for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "applications: admin deletes"
  on applications for delete
  to authenticated
  using (is_admin());

-- -----------------------------------------------------------------------------
-- campaign_deliveries
-- -----------------------------------------------------------------------------

create policy "deliveries: read own or admin"
  on campaign_deliveries for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "deliveries: user updates own content_url"
  on campaign_deliveries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "deliveries: admin full"
  on campaign_deliveries for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- balance_credits
-- -----------------------------------------------------------------------------

create policy "credits: user reads own"
  on balance_credits for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "credits: admin writes"
  on balance_credits for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- withdrawals
-- -----------------------------------------------------------------------------

create policy "withdrawals: user reads own"
  on withdrawals for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "withdrawals: user creates own requested"
  on withdrawals for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'requested');

create policy "withdrawals: admin updates"
  on withdrawals for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------

create policy "subscriptions: user reads own"
  on subscriptions for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "subscriptions: admin writes"
  on subscriptions for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- lessons
-- -----------------------------------------------------------------------------

create policy "lessons: read authenticated"
  on lessons for select
  to authenticated
  using (true);

create policy "lessons: admin writes"
  on lessons for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- lesson_ratings

create policy "ratings: read authenticated"
  on lesson_ratings for select
  to authenticated
  using (true);

create policy "ratings: upsert own"
  on lesson_ratings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- lesson_comments

create policy "comments: read authenticated"
  on lesson_comments for select
  to authenticated
  using (true);

create policy "comments: user creates own"
  on lesson_comments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "comments: user deletes own"
  on lesson_comments for delete
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- watched_lessons

create policy "watched: read own"
  on watched_lessons for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "watched: upsert own"
  on watched_lessons for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- saved_scripts (privado por usuário)
-- -----------------------------------------------------------------------------

create policy "scripts: user full on own"
  on saved_scripts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- =============================================================================
-- Storage buckets + policies
-- =============================================================================

-- Buckets (public = GET liberado sem auth, útil pra servir imagens em <img>)

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('campaign-logos', 'campaign-logos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('lesson-thumbnails', 'lesson-thumbnails', true)
  on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- avatars: cada usuário faz upload em avatars/<user_id>/...
-- -----------------------------------------------------------------------------

create policy "avatars: user manages own folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- campaign-logos: só admin escreve
-- -----------------------------------------------------------------------------

create policy "campaign-logos: admin writes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'campaign-logos' and is_admin())
  with check (bucket_id = 'campaign-logos' and is_admin());

-- -----------------------------------------------------------------------------
-- lesson-thumbnails: só admin escreve
-- -----------------------------------------------------------------------------

create policy "lesson-thumbnails: admin writes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'lesson-thumbnails' and is_admin())
  with check (bucket_id = 'lesson-thumbnails' and is_admin());
-- =============================================================================
-- 0004 — Segurança: rate_limits, ai_usage, withdrawal atômico
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rate_limits: contador por chave com janela deslizante
-- -----------------------------------------------------------------------------

create table if not exists rate_limits (
  key text primary key,
  window_end timestamptz not null,
  count integer not null default 0
);

create index if not exists rate_limits_window_end_idx on rate_limits(window_end);

alter table rate_limits enable row level security;

-- Apenas service_role acessa. Nenhuma policy = acesso via client bloqueado.
-- Uso: via função SECURITY DEFINER abaixo.

create or replace function check_rate_limit(
  p_key text,
  p_max integer,
  p_window_ms bigint
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row rate_limits%rowtype;
begin
  select * into v_row from rate_limits where key = p_key for update;

  if not found or v_row.window_end < v_now then
    insert into rate_limits (key, window_end, count)
    values (p_key, v_now + (p_window_ms::numeric / 1000.0 || ' seconds')::interval, 1)
    on conflict (key) do update
      set window_end = excluded.window_end,
          count = excluded.count;
    return jsonb_build_object('allowed', true);
  end if;

  if v_row.count >= p_max then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_ms', greatest(0, (extract(epoch from (v_row.window_end - v_now)) * 1000)::bigint)
    );
  end if;

  update rate_limits set count = count + 1 where key = p_key;
  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function check_rate_limit(text, integer, bigint) from public;

-- Garbage collect entradas expiradas há mais de 1 dia. Chamável por admin/cron.
create or replace function gc_rate_limits()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from rate_limits where window_end < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function gc_rate_limits() from public;

-- -----------------------------------------------------------------------------
-- ai_usage: controle de chamadas à IA por usuário/mês
-- -----------------------------------------------------------------------------

create table if not exists ai_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  year_month text not null,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create index if not exists ai_usage_user_idx on ai_usage(user_id);

alter table ai_usage enable row level security;

-- Usuário pode LER o próprio uso (pra mostrar na UI); escrita só via função definer.
create policy "ai_usage: user reads own"
  on ai_usage for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- Incrementa atomicamente e retorna total do mês corrente.
create or replace function record_ai_call(p_user_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
  v_calls integer;
begin
  insert into ai_usage (user_id, year_month, calls, updated_at)
  values (p_user_id, v_month, 1, now())
  on conflict (user_id, year_month) do update
    set calls = ai_usage.calls + 1,
        updated_at = now()
  returning calls into v_calls;
  return v_calls;
end;
$$;

revoke all on function record_ai_call(uuid) from public;

create or replace function get_ai_usage_current_month(p_user_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select calls from ai_usage
     where user_id = p_user_id and year_month = to_char(now(), 'YYYY-MM')),
    0
  );
$$;

revoke all on function get_ai_usage_current_month(uuid) from public;
grant execute on function get_ai_usage_current_month(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- request_withdrawal: saque atômico com lock FIFO de créditos
-- -----------------------------------------------------------------------------

create or replace function request_withdrawal(
  p_amount numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pix_key text;
  v_pix_key_type pix_key_type;
  v_available numeric := 0;
  v_credit balance_credits%rowtype;
  v_remaining numeric;
  v_take numeric;
  v_consumed jsonb := '[]'::jsonb;
  v_withdrawal withdrawals%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Não autenticado.');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Valor inválido.');
  end if;

  -- Lê chave PIX direto do profile (fonte de verdade, nunca confiar em client)
  select pix_key, pix_key_type into v_pix_key, v_pix_key_type
  from profiles where id = v_user_id;

  if v_pix_key is null or length(trim(v_pix_key)) < 1 or v_pix_key_type is null then
    return jsonb_build_object('success', false, 'error', 'Cadastre uma chave PIX antes de sacar.');
  end if;

  v_remaining := p_amount;

  -- Lock todos os créditos disponíveis do usuário (ordem FIFO)
  -- O FOR UPDATE impede que outra transação leia/altere os mesmos créditos.
  select coalesce(sum(amount - consumed_amount), 0)
  into v_available
  from balance_credits
  where user_id = v_user_id
    and status = 'available'
    and amount - consumed_amount > 0
  for update;

  if p_amount > v_available then
    return jsonb_build_object('success', false, 'error', 'Saldo disponível insuficiente.');
  end if;

  for v_credit in
    select * from balance_credits
    where user_id = v_user_id
      and status = 'available'
      and amount - consumed_amount > 0
    order by created_at asc
  loop
    exit when v_remaining <= 0;
    v_take := least(v_credit.amount - v_credit.consumed_amount, v_remaining);

    update balance_credits
    set consumed_amount = consumed_amount + v_take,
        status = case
          when consumed_amount + v_take >= amount then 'withdrawn'::credit_status
          else status
        end
    where id = v_credit.id;

    v_consumed := v_consumed || jsonb_build_array(
      jsonb_build_object('creditId', v_credit.id, 'amount', v_take)
    );
    v_remaining := v_remaining - v_take;
  end loop;

  insert into withdrawals (user_id, amount, pix_key, pix_key_type, status, consumed_credits)
  values (v_user_id, p_amount, v_pix_key, v_pix_key_type, 'requested', v_consumed)
  returning * into v_withdrawal;

  return jsonb_build_object(
    'success', true,
    'withdrawal', jsonb_build_object(
      'id', v_withdrawal.id,
      'user_id', v_withdrawal.user_id,
      'amount', v_withdrawal.amount,
      'pix_key', v_withdrawal.pix_key,
      'pix_key_type', v_withdrawal.pix_key_type,
      'status', v_withdrawal.status,
      'created_at', v_withdrawal.created_at,
      'paid_at', v_withdrawal.paid_at,
      'consumed_credits', v_withdrawal.consumed_credits
    )
  );
end;
$$;

revoke all on function request_withdrawal(numeric) from public;
grant execute on function request_withdrawal(numeric) to authenticated;
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
