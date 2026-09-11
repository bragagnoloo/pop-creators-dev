-- =============================================================================
-- 0038 — Agenda de publicações do creator, para evitar choque de horário
-- =============================================================================
--
-- Problema: na Etapa 05 o admin marca data/hora de publicação olhando só a
-- campanha aberta na tela. Como 76% dos creators agendados estão em mais de uma
-- campanha (93 de 123 em 11/09/2026), dá choque de horário sem ninguém ver:
-- medido na base, 50 pares de publicações do mesmo creator com menos de 24h de
-- intervalo e 10 com menos de 2h — um deles com 29 minutos entre dois posts
-- patrocinados de marcas diferentes. Dentro de UMA campanha o conflito é
-- praticamente inexistente (1 par em 48h), então olhar só a campanha atual não
-- resolveria nada.
--
-- Por que não dá para ler campaign_deliveries direto do cliente: a policy de
-- leitura é `user_id = auth.uid() or can_manage_campaign(campaign_id)` (0014).
-- O master admin enxergaria tudo, mas um campaign_admin só enxerga as campanhas
-- atribuídas a ele — e hoje existem 6 campaign_admins, um deles com UMA campanha
-- só. Ele veria a lista quase vazia e concluiria "sem conflito". Um falso OK é
-- pior do que não ter a funcionalidade, daí a função security definer.
--
-- Sigilo: parte dos campaign_admins é externa. A função devolve data, hora e
-- plataforma de TODAS as campanhas, mas o título só quando quem pergunta
-- gerencia aquela campanha; no resto vem 'Outra campanha'. Assim o admin evita
-- o choque sem descobrir a carteira de campanhas das outras marcas.
--
-- Não altera nenhuma policy nem tabela existente: só acrescenta a função.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Agenda consolidada por creator
-- -----------------------------------------------------------------------------

drop function if exists get_creator_publication_schedule(uuid[]);

create function get_creator_publication_schedule(p_user_ids uuid[])
returns table (
  user_id              uuid,
  delivery_id          uuid,
  campaign_id          uuid,
  campaign_title       text,
  can_view_campaign    boolean,
  delivery_index       integer,
  publication_date     timestamptz,
  publication_platforms text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.user_id,
    d.id                                       as delivery_id,
    d.campaign_id,
    case
      when can_manage_campaign(d.campaign_id) then c.title
      else 'Outra campanha'
    end                                        as campaign_title,
    can_manage_campaign(d.campaign_id)         as can_view_campaign,
    d.index                                    as delivery_index,
    d.publication_date,
    d.publication_platforms
  from campaign_deliveries d
  join campaigns c    on c.id = d.campaign_id
  join applications a on a.campaign_id = d.campaign_id
                     and a.user_id     = d.user_id
  where
    -- Porta de entrada: para quem não é admin a função devolve zero linhas.
    -- Fica no WHERE (e não num raise) para a função ser inofensiva por
    -- construção, mesmo que o grant de execute escape em algum refactor.
    is_any_admin()
    and d.user_id = any(p_user_ids)
    and d.publication_date is not null
    -- Desclassificado não publica: a data dele não é conflito de verdade.
    and a.disqualified_at is null
    and a.status = 'approved'
  order by d.publication_date;
$$;

revoke all on function get_creator_publication_schedule(uuid[]) from public;
grant execute on function get_creator_publication_schedule(uuid[]) to authenticated;

notify pgrst, 'reload schema';
