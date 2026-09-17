-- =============================================================================
-- 0039 — Contagem de candidaturas no servidor (corrige número errado no admin)
-- =============================================================================
--
-- Problema medido em 17/09/2026: o painel admin contava candidaturas no cliente,
-- em cima de `getAllApplications()`, que traz no máximo DEFAULT_LIST_LIMIT = 500
-- linhas ordenadas por applied_at desc. Com 3.685 candidaturas na base, o painel
-- enxergava 500 (14%) e tudo anterior a 04/09/2026 18h16 era invisível:
--
--   - 42 das 46 campanhas exibiam número errado;
--   - 16 campanhas exibiam "Inscrições: 0" tendo inscritos de verdade
--     (Meli Music 4 mostrava 0 com 116, Jão 0 com 101, Madonna 0 com 93);
--   - Apple Music mostrava 9 e tem 169; Deck Disk | Pitty mostrava 17 e tem 156;
--   - o dashboard (total, aprovados, taxa de aprovação, gráfico por dia e pizza
--     de status) estava inteiro calculado sobre esses 14%.
--
-- Uma campanha exibindo "0 inscrições" parece quebrada ou vazia, o que alimenta
-- a percepção de que a plataforma está perdendo dados. Daí a correção entrar
-- junto do pacote de soft delete (0040).
--
-- Solução: agregar no Postgres em vez de trafegar linhas e somar no navegador.
-- Fica mais rápido que hoje (uma agregação no servidor contra 500 linhas na
-- rede), não mais lento.
--
-- Visibilidade NÃO muda: a view usa security_invoker e a função é SECURITY
-- INVOKER (padrão), então valem as policies que já existem em `applications`
-- ("user_id = auth.uid() or is_any_admin()"). Admin continua vendo tudo, creator
-- continua vendo só o dele — a diferença é só que agora não vem truncado.
--
-- Migration puramente aditiva: cria uma view e uma função. Nenhuma linha é
-- lida, escrita, alterada ou apagada. Nenhuma tabela ou policy existente é
-- tocada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contagem por campanha — para a listagem do admin
-- -----------------------------------------------------------------------------

drop view if exists campaign_application_counts;

create view campaign_application_counts
with (security_invoker = on)
as
  select
    campaign_id,
    count(*)                                          as total,
    count(*) filter (where status = 'approved')       as approved,
    count(*) filter (where status = 'pending')        as pending,
    count(*) filter (where status = 'rejected')       as rejected
  from applications
  group by campaign_id;

grant select on campaign_application_counts to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Estatísticas globais — para o dashboard
-- -----------------------------------------------------------------------------
--
-- Devolve tudo que o dashboard precisa numa chamada só: totais, quebra por
-- status e a série dos últimos p_days dias.
--
-- O bucket por dia é feito em America/Sao_Paulo. O código antigo bucketizava no
-- cliente comparando a data UTC de applied_at contra o dia local do navegador,
-- o que jogava para o dia errado tudo que foi criado depois das 21h no horário
-- de Brasília. Agora os dois lados usam o mesmo fuso.
--
-- p_days é limitado a [1, 90] para a função não virar scan irrestrito.

drop function if exists get_admin_application_stats(integer);

create function get_admin_application_stats(p_days integer default 14)
returns json
language sql
stable
set search_path = public
as $$
  with parametros as (
    select least(greatest(coalesce(p_days, 14), 1), 90) as dias
  ),
  apps as (
    select
      status,
      (applied_at at time zone 'America/Sao_Paulo')::date as dia
    from applications
  ),
  calendario as (
    select generate_series(
      (now() at time zone 'America/Sao_Paulo')::date - ((select dias from parametros) - 1),
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as dia
  )
  select json_build_object(
    'total',    (select count(*) from apps),
    'approved', (select count(*) from apps where status = 'approved'),
    'pending',  (select count(*) from apps where status = 'pending'),
    'rejected', (select count(*) from apps where status = 'rejected'),
    'by_day',   (
      select coalesce(
        json_agg(
          json_build_object(
            'label', to_char(c.dia, 'DD/MM'),
            'value', (select count(*) from apps a where a.dia = c.dia)
          )
          order by c.dia
        ),
        '[]'::json
      )
      from calendario c
    )
  );
$$;

revoke all on function get_admin_application_stats(integer) from public;
grant execute on function get_admin_application_stats(integer) to authenticated;

notify pgrst, 'reload schema';
