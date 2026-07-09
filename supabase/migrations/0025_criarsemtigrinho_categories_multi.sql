-- =============================================================================
-- 0025 — #CriarSemTigrinho: múltiplas categorias por oportunidade
-- =============================================================================
-- Troca a coluna single `category` por um array `categories`, e atualiza o
-- conjunto de badges para: freelance, agencias, plataformas, marcas (campanhas
-- com marcas), ugc, afiliados. Remove o badge descontinuado 'editais'.
-- =============================================================================

-- 1. Nova coluna array (nullable durante o backfill)
alter table criarsemtigrinho_opportunities
  add column categories text[];

-- 2. Backfill a partir da coluna single, descartando 'editais'
update criarsemtigrinho_opportunities
  set categories = array_remove(array[category], 'editais');

-- 2b. Rede de segurança: linha que ficou sem categoria vira 'plataformas'
update criarsemtigrinho_opportunities
  set categories = array['plataformas']
  where categories is null or cardinality(categories) = 0;

-- 3. Torna obrigatória + valida (pelo menos 1, todas no conjunto permitido)
alter table criarsemtigrinho_opportunities
  alter column categories set not null;

alter table criarsemtigrinho_opportunities
  add constraint criarsemtigrinho_categories_valid check (
    cardinality(categories) >= 1
    and categories <@ array['freelance','agencias','plataformas','marcas','ugc','afiliados']::text[]
  );

-- 4. Remove a coluna antiga (e seu check junto)
alter table criarsemtigrinho_opportunities
  drop column category;
