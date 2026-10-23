-- =============================================================================
-- 0052 — Fluxo alternativo: conta criada pela compra
--
-- Quando a Hotmart aprova uma compra de um e-mail sem conta (comprador de
-- afiliado, ou quem trocou o e-mail no checkout), o webhook cria a conta com o
-- plano ativo e manda um e-mail com link de primeiro acesso. O mesmo vale para
-- quem se cadastrou, nunca confirmou o e-mail e depois comprou.
--
-- Só cria objetos novos: não toca em profiles, subscriptions, handle_new_user
-- nem no guard de campos protegidos. Quem escreve é o servidor (service role);
-- o navegador não lê nem grava nada destas tabelas.
-- =============================================================================

-- Registro de suporte/auditoria: de onde a conta veio e se o e-mail de acesso
-- foi entregue ao Resend. "failed" aqui é venda que precisa de atenção.
create table if not exists purchase_access (
  user_id      uuid primary key references profiles(id) on delete cascade,
  origin       text not null check (origin in ('purchase', 'unconfirmed_signup')),
  transaction  text,
  buyer_name   text,
  buyer_phone  text,
  email_status text check (email_status in ('sent', 'failed')),
  email_error  text,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Token do link de primeiro acesso. Só o sha256 é guardado: quem lê o banco não
-- consegue montar o link. Uso único, validade curta, um ativo por usuário.
create table if not exists account_access_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_access_tokens_user_idx
  on account_access_tokens (user_id) where used_at is null;

alter table purchase_access       enable row level security;
alter table account_access_tokens enable row level security;

-- Sem policies de propósito. O revoke vem DEPOIS do create table porque o
-- Supabase concede privilégios padrão em tabelas novas do schema public.
revoke all on purchase_access       from anon, authenticated;
revoke all on account_access_tokens from anon, authenticated;
