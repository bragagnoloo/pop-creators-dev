-- =============================================================================
-- Inscrições da Campanha Confidencial (convite por email + NDA)
-- Criadores pré-selecionados preenchem o formulário público /campanha-confidencial.
-- Guarda PII sensível (CPF, RG, Pix, endereço) -> RLS ligado SEM policies:
-- acesso apenas via service_role (rotas de insert e admin), que escapa do RLS.
-- =============================================================================

create table campanha_confidencial_inscricoes (
  id                uuid primary key default gen_random_uuid(),
  nome_completo     text not null,
  data_nascimento   date not null,
  instagram         text not null,
  tiktok            text not null,
  nacionalidade     text not null,
  cpf               text not null,
  rg                text not null,
  pix               text not null,
  endereco          text not null,
  cidade_estado     text not null,
  email             text not null,
  criado_em         timestamptz not null default now()
);

-- Índice para buscas/deduplicação por e-mail
create index campanha_confidencial_email_idx on campanha_confidencial_inscricoes (email);

-- RLS ligado, sem policies públicas: escrita/leitura apenas via service_role.
alter table campanha_confidencial_inscricoes enable row level security;
