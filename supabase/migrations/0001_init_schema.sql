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
