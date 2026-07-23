-- =============================================================================
-- 0030 — Campanha Review (POPline Creators Review)
-- =============================================================================
--
-- Adição 100% aditiva de uma terceira categoria de campanha. NÃO altera o
-- comportamento das campanhas existentes (padrão/pública nem convite/oculta):
--   * Nova coluna is_review default false → toda campanha atual continua igual.
--   * Review é PÚBLICA (is_invite = false): herda a policy pública de leitura e a
--     RPC apply_with_term (auto-inscrição com termo) exatamente como estão.
--     Portanto NÃO tocamos em RLS nem em nenhuma RPC.
--   * A distinção puramente visual/organizacional (aba própria, borda roxa) é feita
--     na aplicação a partir da flag is_review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna is_review
-- -----------------------------------------------------------------------------

alter table campaigns
  add column if not exists is_review boolean not null default false;

-- Index parcial: acelera qualquer filtro por campanhas review (poucas linhas).
create index if not exists campaigns_is_review_idx on campaigns(is_review) where is_review;

-- -----------------------------------------------------------------------------
-- 2. Exclusão mútua entre tipos: uma campanha não pode ser convite E review.
--    NOT VALID + validate: como todas as linhas atuais têm is_review = false,
--    a validação não pode falhar em dado existente.
-- -----------------------------------------------------------------------------

alter table campaigns
  drop constraint if exists campaigns_type_exclusive;

alter table campaigns
  add constraint campaigns_type_exclusive
  check (not (is_invite and is_review)) not valid;

alter table campaigns
  validate constraint campaigns_type_exclusive;
