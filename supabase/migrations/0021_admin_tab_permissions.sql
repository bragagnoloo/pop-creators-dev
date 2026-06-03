-- =============================================================================
-- 0021 — Permissões granulares por aba para campaign_admin
-- =============================================================================
-- Permite que master admin conceda acesso a abas específicas (Assinaturas,
-- Usuários, Ranking) para um campaign_admin sem promover ele a master.
-- Master admin (role='admin') sempre vê tudo e ignora essa coluna.
-- =============================================================================

alter table profiles
  add column if not exists extra_admin_tabs text[] not null default '{}';

-- Constraint: apenas valores válidos podem estar no array
alter table profiles
  drop constraint if exists extra_admin_tabs_valid;

alter table profiles
  add constraint extra_admin_tabs_valid check (
    extra_admin_tabs <@ array['assinaturas', 'users', 'ranking']::text[]
  );

-- Helper SQL: usuário atual tem acesso a determinada aba?
create or replace function has_admin_tab(p_tab text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (
      select
        role = 'admin'
        or (role = 'campaign_admin' and p_tab = any(extra_admin_tabs))
      from profiles
      where id = auth.uid()
    ),
    false
  );
$$;
