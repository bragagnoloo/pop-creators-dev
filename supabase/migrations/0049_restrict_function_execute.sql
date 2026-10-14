-- =============================================================================
-- 0049 — Funções do schema public: ninguém executa por padrão
-- =============================================================================
--
-- O verificador do Supabase apontava 54 funções SECURITY DEFINER executáveis
-- por visitante (anon) e 57 por qualquer conta logada. No incidente de
-- 2026-10-10→13, uma delas (get_admin_ranking) entregava email/WhatsApp de toda
-- a base sem checar quem chamava.
--
-- Levantamento feito antes desta migration:
--   - nenhuma página pública chama RPC; nenhuma policy aplicada a anon usa função
--     → anon não precisa executar NADA em public
--   - policies (tabelas e storage) usam só: can_manage_campaign, is_admin,
--     is_any_admin, is_campaign_participant, is_master_admin — e o guard
--     SECURITY INVOKER de profiles chama is_admin → esses ficam para authenticated
--   - as RPCs que o app chama com o JWT do usuário ficam para authenticated
--     (todas checam permissão por dentro)
--   - helpers chamados só de dentro de funções SECURITY DEFINER (rodam como dono)
--     e funções de trigger (disparo não checa EXECUTE) fecham para todos
--   - service_role (rotas de servidor) mantém execução em tudo
--
-- Funções novas continuam nascendo com EXECUTE para PUBLIC (padrão do Postgres).
-- Mudar o default global foi descartado: afetaria extensões futuras e um
-- CREATE OR REPLACE em migration futura não restauraria grants. Em vez disso,
-- audit_function_grants() alimenta a suíte diária de testes, que alerta por
-- email quando aparece função executável fora da lista permitida.
-- =============================================================================

do $$
declare
  f record;
  v_keep_authenticated text[] := array[
    -- usadas por policies / guard
    'can_manage_campaign', 'is_admin', 'is_any_admin', 'is_campaign_participant', 'is_master_admin',
    -- RPCs chamadas pelo app com o JWT do usuário
    'add_campaign_guest', 'apply_with_term', 'clear_delivery_content_url', 'complete_stage',
    'create_notice', 'disqualify_participant', 'flag_withdrawal', 'get_admin_application_stats',
    'get_admin_user_ranks', 'get_ai_usage_current_month', 'get_alltime_ranking',
    'get_campaign_archive_impact', 'get_creator_publication_schedule', 'get_lesson_comments',
    'get_monthly_ranking', 'get_user_ranking_stats', 'init_campaign_schedule', 'mark_joined_group',
    'record_daily_login', 'remove_campaign_guest', 'request_delivery_revision',
    'request_publication_revision', 'request_withdrawal', 'restore_campaign', 'revert_stage',
    'set_campaign_assigned_admin', 'set_deliverable_status', 'set_publication_schedule',
    'set_publication_status', 'set_stage_deadline', 'soft_delete_campaign', 'stage_readiness'
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'   -- ignora funções de extensões
       )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if f.proname = any(v_keep_authenticated) then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- search_path fixo nas funções que o verificador apontou (nenhuma usa objeto
-- fora de public/pg_catalog — conferido antes desta migration).
-- -----------------------------------------------------------------------------

alter function public.trg_award_watch_lesson_points()      set search_path = public, pg_temp;
alter function public.trg_award_plan_points()              set search_path = public, pg_temp;
alter function public.trg_award_campaign_approved_points() set search_path = public, pg_temp;
alter function public.set_updated_at()                     set search_path = public, pg_temp;
alter function public.record_daily_login()                 set search_path = public, pg_temp;
alter function public.normalize_pix_key(text, text)        set search_path = public, pg_temp;
alter function public.is_ranking_eligible(uuid)            set search_path = public, pg_temp;
alter function public.get_user_ranking_stats()             set search_path = public, pg_temp;
alter function public.get_monthly_ranking(integer)         set search_path = public, pg_temp;
alter function public.get_alltime_ranking(integer)         set search_path = public, pg_temp;
alter function public.get_admin_ranking(text, integer, integer, text, text, integer) set search_path = public, pg_temp;
alter function public.current_plan_of(plan_id, timestamptz) set search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- Auditoria de grants para a suíte de testes (só service role)
-- -----------------------------------------------------------------------------

create or replace function audit_function_grants()
returns table(name text, signature text, anon boolean, authenticated boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.proname::text,
         p.oid::regprocedure::text,
         has_function_privilege('anon', p.oid, 'execute'),
         has_function_privilege('authenticated', p.oid, 'execute')
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and (has_function_privilege('anon', p.oid, 'execute')
          or has_function_privilege('authenticated', p.oid, 'execute'))
   order by 1;
$$;

revoke execute on function audit_function_grants() from public, anon, authenticated;
grant execute on function audit_function_grants() to service_role;

notify pgrst, 'reload schema';
