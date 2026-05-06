-- Migração: introduz oficinas (workshops) como nível superior das aulas
-- Cada lesson existente ganha uma workshop correspondente.
-- Lessons perdem expert e thumbnail_url (sobem para o nível da workshop).

-- 1. Tabela workshops
create table workshops (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  expert      text,
  description text        not null default '',
  thumbnail_url text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger workshops_updated_at
  before update on workshops
  for each row execute function set_updated_at();

create index workshops_position_idx on workshops(position asc);

-- 2. RLS para workshops
alter table workshops enable row level security;

create policy "workshops: read authenticated"
  on workshops for select
  to authenticated using (true);

create policy "workshops: admin writes"
  on workshops for all
  to authenticated
  using (is_admin()) with check (is_admin());

-- 3. Adicionar workshop_id em lessons (nullable enquanto migramos)
alter table lessons add column workshop_id uuid references workshops(id) on delete cascade;

-- 4. Migrar dados: para cada lesson existente, criar uma workshop
insert into workshops (id, title, expert, description, thumbnail_url, position, created_at)
select
  gen_random_uuid(),
  title,
  expert,
  description,
  thumbnail_url,
  position,
  created_at
from lessons;

-- 5. Vincular cada lesson à workshop recém-criada
-- Usa título + expert + position como chave de matching (únicos no contexto da migração)
update lessons l
set workshop_id = w.id
from workshops w
where w.title = l.title
  and w.position = l.position
  and (w.expert = l.expert or (w.expert is null and l.expert is null));

-- 6. Tornar workshop_id obrigatório
alter table lessons alter column workshop_id set not null;

-- 7. Remover colunas que sobem para o nível da workshop
alter table lessons drop column expert;
alter table lessons drop column thumbnail_url;

-- 8. Índice útil para buscar aulas de uma oficina
create index lessons_workshop_id_idx on lessons(workshop_id, position asc);
