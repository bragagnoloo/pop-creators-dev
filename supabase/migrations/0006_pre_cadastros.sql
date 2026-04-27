-- =============================================================================
-- Leads de pré-venda — capturados antes do lançamento da plataforma
-- Não têm acesso ao Supabase Auth nem a nenhuma rota da plataforma.
-- =============================================================================

create table pre_cadastros (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null,
  whatsapp    text not null,
  criado_em   timestamptz not null default now()
);

-- Índice para facilitar buscas por e-mail (ex: evitar duplicatas manualmente)
create index pre_cadastros_email_idx on pre_cadastros (email);

-- RLS ativado — sem policies públicas.
-- Acesso apenas via service_role (admin), que escapa do RLS.
alter table pre_cadastros enable row level security;
