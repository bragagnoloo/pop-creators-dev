-- =============================================================================
-- 0048 — Alerta de acesso ao painel ignora a conta de teste de segurança
-- =============================================================================
--
-- A suíte diária (src/lib/security-tests.ts) promove a conta
-- qa-security-campadmin a campaign_admin só durante a execução e a devolve a
-- creator no fim, para não deixar uma conta com leitura de todos os perfis
-- parada em produção. Sem esta exceção, cada execução geraria dois emails.
--
-- A exceção é estreita de propósito: só esse id fixo, só creator ↔
-- campaign_admin e só sem abas extras. Se essa conta virar admin master ou
-- ganhar abas, o alerta dispara normalmente.
-- =============================================================================

create or replace function alert_profile_access_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id = '2bbd88d2-8a6c-4391-abb4-e41f8b97c9d1'::uuid
     and old.role::text in ('creator', 'campaign_admin')
     and new.role::text in ('creator', 'campaign_admin')
     and coalesce(array_length(new.extra_admin_tabs, 1), 0) = 0
     and coalesce(array_length(old.extra_admin_tabs, 1), 0) = 0 then
    return null;
  end if;

  perform raise_security_alert(
    'access_change',
    'critical',
    'Mudança de acesso ao painel: ' || coalesce(new.email, new.id::text)
      || ' (' || old.role::text || ' → ' || new.role::text || ')',
    jsonb_build_object(
      'Conta', coalesce(new.email, new.id::text),
      'Nome', coalesce(nullif(new.full_name, ''), '—'),
      'Cargo antes', old.role::text,
      'Cargo depois', new.role::text,
      'Abas extras antes', coalesce(array_to_string(old.extra_admin_tabs, ', '), ''),
      'Abas extras depois', coalesce(array_to_string(new.extra_admin_tabs, ', '), ''),
      'Link', 'https://poplinecreators.com.br/admin/admins'
    )
  );
  return null;
end;
$$;
