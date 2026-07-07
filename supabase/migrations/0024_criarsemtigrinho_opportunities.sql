-- =============================================================================
-- 0024 — #CriarSemTigrinho: oportunidades de monetização
-- =============================================================================
-- Conteúdo da página pública /criarsemtigrinho, gerenciado pela aba admin
-- "Oportunidades". Namespaced (criarsemtigrinho_*) e sem acoplamento a nenhuma
-- feature existente, para que a remoção futura seja trivial.
-- =============================================================================

-- 1. Tabela
create table criarsemtigrinho_opportunities (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  category    text        not null check (category in ('marcas','ugc','afiliados','plataformas','editais')),
  logo_url    text,
  short_desc  text        not null,
  full_desc   text        not null,
  url         text        not null,
  position    integer     not null default 0,
  published   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger criarsemtigrinho_opportunities_updated_at
  before update on criarsemtigrinho_opportunities
  for each row execute function set_updated_at();

create index criarsemtigrinho_opportunities_position_idx
  on criarsemtigrinho_opportunities(position asc);

-- 2. RLS
alter table criarsemtigrinho_opportunities enable row level security;

-- Leitura pública: a página /criarsemtigrinho é pública. Qualquer um (anon ou
-- autenticado) lê apenas os itens publicados.
create policy "criarsemtigrinho: public read published"
  on criarsemtigrinho_opportunities for select
  to anon, authenticated
  using (published = true);

-- Escrita restrita a admin master.
create policy "criarsemtigrinho: admin writes"
  on criarsemtigrinho_opportunities for all
  to authenticated
  using (is_admin()) with check (is_admin());

-- 3. Bucket público de logos (public = true libera GET anônimo p/ servir em <img>)
insert into storage.buckets (id, name, public)
  values ('criarsemtigrinho-logos', 'criarsemtigrinho-logos', true)
  on conflict (id) do nothing;

create policy "criarsemtigrinho-logos: admin writes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'criarsemtigrinho-logos' and is_admin())
  with check (bucket_id = 'criarsemtigrinho-logos' and is_admin());
