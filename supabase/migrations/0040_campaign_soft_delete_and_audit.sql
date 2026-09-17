-- =============================================================================
-- 0040 — Campanha deixa de ser destruível + trilha de auditoria
-- =============================================================================
--
-- Incidente que originou esta migration (apurado em 17/09/2026): a campanha
-- RÉVEILLON CHEERS 2027 sumiu da plataforma. Não era bug de exibição — a linha
-- tinha sido apagada de verdade. `deleteCampaign` fazia DELETE físico e as 11
-- tabelas filhas têm ON DELETE CASCADE, então foram junto as 9 candidaturas
-- aprovadas, entregas, financeiro, créditos de saldo e aceites de termo (LGPD).
--
-- Não havia como saber o que se perdeu: nenhum log, nenhuma cópia. O título só
-- foi recuperado por acaso, porque uma creator colou o briefing no gerador de
-- roteiros 1h depois de ser aprovada, e `saved_scripts` é a única tabela que
-- referencia campanha sem FK/cascade. Ao todo 9 campanhas já foram apagadas
-- assim desde abril/2026; 5 delas não deixaram vestígio nenhum.
--
-- Esta migration ataca as duas pontas:
--
--   1. PREVENÇÃO — o app perde a capacidade de apagar campanha. A policy de
--      DELETE é derrubada e o privilégio revogado, então nem clique errado, nem
--      bug, nem chamada direta ao PostgREST destrói a linha. Excluir vira
--      arquivar (deleted_at), reversível por restore_campaign.
--
--   2. RECUPERAÇÃO — audit_log guarda a linha INTEIRA em `before` a cada
--      update/delete. Se um dia algo apagar um registro por fora do app (SQL
--      direto, por exemplo), a campanha e suas entregas continuam
--      reconstruíveis a partir do log, sem depender de backup.
--
-- GARANTIA DE ZERO IMPACTO — nenhuma campanha muda de comportamento:
--   - só ADD COLUMN anulável e CREATE TABLE nova; no PG 11+ isso é alteração de
--     metadado, instantânea, sem reescrever tabela e sem lock de escrita;
--   - nenhum UPDATE de backfill, nenhum DROP de coluna, nenhuma linha tocada;
--   - a policy nova é `deleted_at is null or is_master_admin()`, e como toda
--     campanha existente nasce com deleted_at NULL, as 46 passam no filtro por
--     construção. Não é "provavelmente não afeta": é impossível afetar;
--   - a única perda é uma CAPACIDADE (apagar), não um dado.
--
-- ATENÇÃO À ORDEM DE DEPLOY: esta migration tem que estar aplicada ANTES de o
-- código pedir `deleted_at` no C_SELECT. Se o código for primeiro, o PostgREST
-- devolve 42703, o service engole o erro (ver comentário em services/campaigns.ts)
-- e a listagem inteira fica vazia — todas as campanhas "somem" de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trilha de auditoria (criada primeiro, para já registrar o resto)
-- -----------------------------------------------------------------------------

create table if not exists audit_log (
  id          bigserial primary key,
  table_name  text        not null,
  record_id   uuid,
  action      text        not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id    uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_record_idx  on audit_log (table_name, record_id, created_at desc);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

alter table audit_log enable row level security;

-- Só o master admin lê. E NINGUÉM escreve, edita ou apaga pelo app: não existe
-- policy de insert/update/delete, de propósito. Quem grava é o trigger, que é
-- security definer e roda como dono da tabela. Log que o app consegue alterar
-- não é log.
drop policy if exists "audit_log: master admin reads" on audit_log;
create policy "audit_log: master admin reads"
  on audit_log for select
  to authenticated
  using (is_master_admin());

-- Função de trigger genérica. Guarda a linha inteira, não só as colunas
-- alteradas — é isso que torna a reconstrução possível.
create or replace function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
begin
  insert into audit_log (table_name, record_id, action, actor_id, before, after)
  values (
    tg_table_name,
    (coalesce(v_new, v_old) ->> 'id')::uuid,
    tg_op,
    auth.uid(),
    v_old,
    v_new
  );
  return null;
end;
$$;

-- Aplicado só a tabelas que têm coluna `id` do tipo uuid (o cast acima depende
-- disso) e que carregam dado irrecuperável: a campanha, quem se candidatou, o
-- que foi entregue e o dinheiro.
drop trigger if exists audit_campaigns           on campaigns;
drop trigger if exists audit_applications        on applications;
drop trigger if exists audit_campaign_deliveries on campaign_deliveries;
drop trigger if exists audit_balance_credits     on balance_credits;

create trigger audit_campaigns
  after insert or update or delete on campaigns
  for each row execute function audit_row_change();

create trigger audit_applications
  after insert or update or delete on applications
  for each row execute function audit_row_change();

create trigger audit_campaign_deliveries
  after insert or update or delete on campaign_deliveries
  for each row execute function audit_row_change();

create trigger audit_balance_credits
  after insert or update or delete on balance_credits
  for each row execute function audit_row_change();

-- -----------------------------------------------------------------------------
-- 2. Colunas de arquivamento
-- -----------------------------------------------------------------------------

alter table campaigns add column if not exists deleted_at timestamptz;
alter table campaigns add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists campaigns_deleted_at_idx on campaigns (deleted_at) where deleted_at is not null;

-- -----------------------------------------------------------------------------
-- 3. Campanha arquivada some de todo mundo, menos do master admin
-- -----------------------------------------------------------------------------
--
-- RESTRICTIVE: soma com AND às outras policies de select, então vale inclusive
-- junto da "read authenticated" (qual = true). Para o creator o efeito é
-- idêntico ao de hoje quando a campanha era apagada — ela some da vitrine.

drop policy if exists "campaigns: hide archived" on campaigns;
create policy "campaigns: hide archived"
  on campaigns as restrictive for select
  to authenticated
  using (deleted_at is null or is_master_admin());

-- -----------------------------------------------------------------------------
-- 4. O app perde o poder de apagar campanha
-- -----------------------------------------------------------------------------
--
-- Sem policy de DELETE, o RLS nega por padrão. O revoke é cinto e suspensório:
-- se um dia alguém recriar a policy sem querer, o privilégio ainda falta.

drop policy if exists "campaigns: master admin delete" on campaigns;
revoke delete on campaigns from authenticated;
revoke delete on campaigns from anon;

-- -----------------------------------------------------------------------------
-- 5. Arquivar e restaurar
-- -----------------------------------------------------------------------------
--
-- Arquivar é BLOQUEADO quando existe creator aprovado ou crédito de saldo já
-- liberado. Foi exatamente esse o caso da Réveillon Cheers: 9 aprovados. Quem
-- quiser mesmo arquivar precisa antes desfazer as aprovações — um caminho
-- consciente, não um clique.

create or replace function soft_delete_campaign(p_campaign_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
  v_titulo     text;
  v_aprovados  integer;
  v_creditos   integer;
begin
  if not is_master_admin() then
    return json_build_object('success', false, 'error', 'Você não tem permissão para arquivar campanhas.');
  end if;

  select deleted_at, title into v_deleted_at, v_titulo
  from campaigns where id = p_campaign_id;

  if not found then
    return json_build_object('success', false, 'error', 'Campanha não encontrada.');
  end if;

  if v_deleted_at is not null then
    return json_build_object('success', false, 'error', 'Esta campanha já está arquivada.');
  end if;

  select count(*) into v_aprovados
  from applications where campaign_id = p_campaign_id and status = 'approved';

  select count(*) into v_creditos
  from balance_credits
  where campaign_id = p_campaign_id and status in ('available', 'withdrawn');

  if v_aprovados > 0 then
    return json_build_object(
      'success', false,
      'error', format(
        'Esta campanha tem %s creator(s) aprovado(s). Reprove ou remova as aprovações antes de arquivar.',
        v_aprovados
      )
    );
  end if;

  if v_creditos > 0 then
    return json_build_object(
      'success', false,
      'error', format(
        'Esta campanha já liberou %s crédito(s) de saldo e não pode ser arquivada.',
        v_creditos
      )
    );
  end if;

  update campaigns
     set deleted_at = now(),
         deleted_by = auth.uid()
   where id = p_campaign_id;

  return json_build_object('success', true, 'title', v_titulo);
end;
$$;

create or replace function restore_campaign(p_campaign_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
  v_titulo     text;
begin
  if not is_master_admin() then
    return json_build_object('success', false, 'error', 'Você não tem permissão para restaurar campanhas.');
  end if;

  select deleted_at, title into v_deleted_at, v_titulo
  from campaigns where id = p_campaign_id;

  if not found then
    return json_build_object('success', false, 'error', 'Campanha não encontrada.');
  end if;

  if v_deleted_at is null then
    return json_build_object('success', false, 'error', 'Esta campanha não está arquivada.');
  end if;

  update campaigns
     set deleted_at = null,
         deleted_by = null
   where id = p_campaign_id;

  return json_build_object('success', true, 'title', v_titulo);
end;
$$;

revoke all on function soft_delete_campaign(uuid) from public;
revoke all on function restore_campaign(uuid)     from public;
grant execute on function soft_delete_campaign(uuid) to authenticated;
grant execute on function restore_campaign(uuid)     to authenticated;

-- -----------------------------------------------------------------------------
-- 6. O que uma campanha leva junto se for arquivada
-- -----------------------------------------------------------------------------
--
-- Alimenta o modal de confirmação: o admin passa a ver o tamanho do estrago
-- ANTES de confirmar. Hoje o modal não diz nem o nome da campanha.

create or replace function get_campaign_archive_impact(p_campaign_id uuid)
returns json
language sql
stable
set search_path = public
as $$
  select json_build_object(
    'title',        (select title from campaigns where id = p_campaign_id),
    'applications', (select count(*) from applications       where campaign_id = p_campaign_id),
    'approved',     (select count(*) from applications       where campaign_id = p_campaign_id and status = 'approved'),
    'deliveries',   (select count(*) from campaign_deliveries where campaign_id = p_campaign_id),
    'credits',      (select count(*) from balance_credits     where campaign_id = p_campaign_id
                                                                and status in ('available', 'withdrawn'))
  );
$$;

revoke all on function get_campaign_archive_impact(uuid) from public;
grant execute on function get_campaign_archive_impact(uuid) to authenticated;

notify pgrst, 'reload schema';
