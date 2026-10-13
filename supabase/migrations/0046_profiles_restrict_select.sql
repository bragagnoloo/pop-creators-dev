-- =============================================================================
-- 0046 — profiles: leitura só do próprio perfil (ou da equipe)
-- =============================================================================
--
-- A policy "profiles: users read any authenticated" (using true) deixava
-- qualquer conta logada — inclusive uma recém-criada pelo cadastro público —
-- listar os ~3 mil perfis com chave PIX, titular, endereço, CEP e WhatsApp.
-- No incidente de 2026-10-10→13 o atacante continuou lendo perfis mesmo depois
-- de rebaixado de admin.
--
-- Quem precisa ler perfil alheio:
--   - painel admin (admin e campaign_admin) → is_any_admin()
--   - rotas de servidor (emails, webhooks, tracking) → service role, ignora RLS
--   - comentários das oficinas (nome + foto do autor) → get_lesson_comments,
--     que expõe só esses dois campos.
-- Rankings já passam por funções SECURITY DEFINER.
-- =============================================================================

drop policy if exists "profiles: users read any authenticated" on profiles;
drop policy if exists "profiles: read own or staff" on profiles;

create policy "profiles: read own or staff"
  on profiles for select
  to authenticated
  using (id = auth.uid() or is_any_admin());

-- Comentários das oficinas: só nome e foto do autor, nunca email/contato.
create or replace function get_lesson_comments(p_lesson_id uuid)
returns table(
  id uuid,
  lesson_id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  author_name text,
  author_photo text
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.lesson_id,
    c.user_id,
    c.content,
    c.created_at,
    coalesce(nullif(trim(p.full_name), ''), 'Usuário') as author_name,
    p.photo_url as author_photo
  from lesson_comments c
  left join profiles p on p.id = c.user_id
  where c.lesson_id = p_lesson_id
    and auth.uid() is not null
  order by c.created_at desc;
$$;

revoke all on function get_lesson_comments(uuid) from public, anon;
grant execute on function get_lesson_comments(uuid) to authenticated;

notify pgrst, 'reload schema';
