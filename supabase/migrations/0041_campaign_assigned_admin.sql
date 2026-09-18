-- =============================================================================
-- 0041 — Admin designado da campanha (etiqueta de controle interno)
-- =============================================================================
--
-- O que é: um nome livre, digitado pelo master admin, que aparece como etiqueta
-- ao lado do status na listagem de campanhas do painel e alimenta o gráfico de
-- carga por admin no dashboard.
--
-- O que NÃO é: permissão. Este campo não dá nem tira acesso a nada — quem
-- controla acesso de verdade continua sendo `admin_campaign_assignments` +
-- can_manage_campaign() (migration 0014). É texto solto, de propósito, porque a
-- pessoa designada pode nem ter conta na plataforma. Nenhum fluxo de campanha
-- lê esta coluna para decidir coisa alguma.
--
-- Só o master admin escreve. O INSERT já é master-only pela policy
-- "campaigns: master admin insert", mas o UPDATE é `can_manage_campaign(id)`,
-- que inclui os campaign_admins atribuídos. Por isso o trigger abaixo: sem ele,
-- um campaign_admin poderia trocar a etiqueta chamando o PostgREST direto.
--
-- Migration aditiva: uma coluna anulável (metadado, instantânea), um trigger e
-- uma função. Nenhuma linha lida ou alterada — as 47 campanhas nascem com a
-- coluna NULL, que é exatamente "sem admin designado".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna
-- -----------------------------------------------------------------------------

alter table campaigns add column if not exists assigned_admin_name text;

-- Índice parcial: o dashboard agrupa por este campo e a maioria das linhas é
-- NULL, então só vale indexar quem tem valor.
create index if not exists campaigns_assigned_admin_idx
  on campaigns (assigned_admin_name)
  where assigned_admin_name is not null;

-- -----------------------------------------------------------------------------
-- 2. Só o master admin troca a etiqueta
-- -----------------------------------------------------------------------------
--
-- Compara com `is distinct from` para que qualquer outro update na campanha
-- (mudar etapa, link do grupo, status) siga funcionando normalmente para os
-- campaign_admins — o trigger só reage quando ESTA coluna muda de valor.

create or replace function guard_assigned_admin_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_admin_name is distinct from old.assigned_admin_name
     and not is_master_admin() then
    raise exception 'Somente o admin master pode designar o admin da campanha.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_guard_assigned_admin on campaigns;
create trigger campaigns_guard_assigned_admin
  before update on campaigns
  for each row execute function guard_assigned_admin_name();

-- -----------------------------------------------------------------------------
-- 3. Atribuir / trocar / remover
-- -----------------------------------------------------------------------------
--
-- Nome vazio (ou só espaços) grava NULL: é assim que se remove a designação.
-- O limite de 80 caracteres existe só para a etiqueta não estourar o layout.

create or replace function set_campaign_assigned_admin(
  p_campaign_id uuid,
  p_name        text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if not is_master_admin() then
    return json_build_object('success', false, 'error', 'Somente o admin master pode designar o admin da campanha.');
  end if;

  if not exists (select 1 from campaigns where id = p_campaign_id) then
    return json_build_object('success', false, 'error', 'Campanha não encontrada.');
  end if;

  v_nome := nullif(btrim(coalesce(p_name, '')), '');

  if v_nome is not null and length(v_nome) > 80 then
    return json_build_object('success', false, 'error', 'O nome do admin designado deve ter no máximo 80 caracteres.');
  end if;

  update campaigns set assigned_admin_name = v_nome where id = p_campaign_id;

  return json_build_object('success', true, 'assignedAdminName', v_nome);
end;
$$;

revoke all on function set_campaign_assigned_admin(uuid, text) from public;
grant execute on function set_campaign_assigned_admin(uuid, text) to authenticated;

notify pgrst, 'reload schema';
