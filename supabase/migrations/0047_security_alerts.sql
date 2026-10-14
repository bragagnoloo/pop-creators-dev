-- =============================================================================
-- 0047 — Alertas de segurança por email
-- =============================================================================
--
-- Depois do incidente de 2026-10-10→13 (escalada a admin + fraude de saldo),
-- a equipe passa a ser avisada em poplinecreators@gmail.com quando acontecer:
--
--   1. mudança de acesso ao painel (role / extra_admin_tabs)
--   3. saque pedido por conta com menos de 7 dias
--   4. saque para chave PIX cadastrada/usada por outra conta
--   5. senha ou email de conta da equipe alterados
--   6. admin com menos de 7 dias (de conta ou de cargo) mexendo em dinheiro:
--      gerar/liberar saldo, aprovar inscrição, notificar/pagar saque
--
-- Fluxo: triggers gravam em security_alerts → trigger nessa tabela chama
-- /api/security/alerts/dispatch via pg_net (só sai se a transação commitar) →
-- a rota reivindica os pendentes e manda o email. pg_cron repete a chamada a
-- cada 5 min para o que tiver falhado.
--
-- Os alertas só observam: qualquer erro ao registrar alerta é engolido para
-- nunca derrubar a operação legítima que o disparou.
-- =============================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- -----------------------------------------------------------------------------
-- Tabela
-- -----------------------------------------------------------------------------

create table if not exists security_alerts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  kind         text not null,
  severity     text not null check (severity in ('critical', 'warning')),
  title        text not null,
  details      jsonb not null default '{}'::jsonb,
  actor_id     uuid,
  dedupe_key   text,
  occurrences  integer not null default 1,
  last_seen_at timestamptz not null default now(),
  sent_at      timestamptz,
  claimed_at   timestamptz,
  attempts     integer not null default 0,
  last_error   text
);

create index if not exists security_alerts_pending_idx
  on security_alerts (created_at) where sent_at is null;
create index if not exists security_alerts_dedupe_idx
  on security_alerts (dedupe_key, created_at) where dedupe_key is not null;

alter table security_alerts enable row level security;

drop policy if exists "security_alerts: master admin reads" on security_alerts;
create policy "security_alerts: master admin reads"
  on security_alerts for select to authenticated
  using (is_master_admin());

revoke insert, update, delete on security_alerts from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Quem está agindo, em texto legível para o email.
create or replace function security_actor_label()
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'servidor (painel admin / webhook / SQL)'
    else coalesce(
      (select email || ' (' || role::text || ')' from profiles where id = auth.uid()),
      auth.uid()::text
    )
  end;
$$;

-- Normaliza chave PIX para comparação: cpf/cnpj/telefone só dígitos, resto lower/trim.
create or replace function normalize_pix_key(p_key text, p_type text)
returns text language sql immutable as $$
  select case
    when p_key is null or length(trim(p_key)) = 0 then null
    when p_type in ('cpf', 'cnpj', 'phone') then nullif(regexp_replace(p_key, '\D', '', 'g'), '')
    else lower(regexp_replace(p_key, '\s', '', 'g'))
  end;
$$;

-- Registra alerta. Com dedupe_key, ocorrências repetidas dentro da janela só
-- incrementam o contador do alerta existente (evita rajada de emails).
create or replace function raise_security_alert(
  p_kind text,
  p_severity text,
  p_title text,
  p_details jsonb,
  p_dedupe_key text default null,
  p_dedupe_window interval default interval '30 minutes'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_dedupe_key is not null then
    update security_alerts
       set occurrences = occurrences + 1,
           last_seen_at = now()
     where id = (
       select id from security_alerts
        where dedupe_key = p_dedupe_key
          and created_at > now() - p_dedupe_window
        order by created_at desc
        limit 1
     )
    returning id into v_id;
    if v_id is not null then
      return;
    end if;
  end if;

  insert into security_alerts (kind, severity, title, details, actor_id, dedupe_key)
  values (
    p_kind,
    p_severity,
    p_title,
    coalesce(p_details, '{}'::jsonb)
      || jsonb_build_object('Feito por', security_actor_label()),
    auth.uid(),
    p_dedupe_key
  );
exception when others then
  -- Alerta nunca derruba a operação que o disparou.
  raise warning 'raise_security_alert falhou: %', sqlerrm;
end;
$$;

revoke all on function raise_security_alert(text, text, text, jsonb, text, interval) from public, anon, authenticated;
revoke all on function security_actor_label() from public, anon, authenticated;

-- "Admin novo": conta criada há < 7 dias ou que ganhou acesso ao painel há < 7 dias.
create or replace function is_recent_staff(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join auth.users u on u.id = p.id
    where p.id = p_user_id
      and p.role in ('admin', 'campaign_admin')
      and (
        u.created_at > now() - interval '7 days'
        or exists (
          select 1 from audit_log a
           where a.table_name = 'profiles'
             and a.record_id = p_user_id
             and a.created_at > now() - interval '7 days'
             and a.before->>'role' is distinct from a.after->>'role'
             and a.after->>'role' in ('admin', 'campaign_admin')
        )
      )
  );
$$;
revoke all on function is_recent_staff(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Gatilho 1 — mudança de acesso ao painel
-- -----------------------------------------------------------------------------

create or replace function alert_profile_access_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

drop trigger if exists alert_profile_access_change on profiles;
create trigger alert_profile_access_change
  after update on profiles
  for each row
  when (
       old.role             is distinct from new.role
    or old.extra_admin_tabs is distinct from new.extra_admin_tabs
  )
  execute function alert_profile_access_change();

-- -----------------------------------------------------------------------------
-- Gatilhos 3 e 4 — saque de conta nova / chave PIX de outra conta
-- -----------------------------------------------------------------------------

create or replace function alert_withdrawal_requested()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account_created timestamptz;
  v_email text;
  v_name text;
  v_key text := normalize_pix_key(new.pix_key, new.pix_key_type::text);
  v_others text;
  v_base jsonb;
begin
  select u.created_at, p.email, p.full_name
    into v_account_created, v_email, v_name
  from auth.users u join profiles p on p.id = u.id
  where u.id = new.user_id;

  v_base := jsonb_build_object(
    'Conta', coalesce(v_email, new.user_id::text),
    'Nome no cadastro', coalesce(nullif(v_name, ''), '—'),
    'Valor', 'R$ ' || translate(to_char(new.amount, 'FM999G999G990D00'), ',.', '.,'),
    'Chave PIX', coalesce(new.pix_key, '—') || ' (' || coalesce(new.pix_key_type::text, '?') || ')',
    'Titular informado', coalesce(new.pix_holder_name, '—'),
    'Conta criada em', to_char(v_account_created at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    'Link', 'https://poplinecreators.com.br/admin/saques'
  );

  -- 3. conta com menos de 7 dias
  if v_account_created is not null
     and new.created_at - v_account_created < interval '7 days' then
    perform raise_security_alert(
      'withdrawal_new_account',
      'critical',
      'Saque de conta nova: ' || coalesce(v_email, new.user_id::text)
        || ' pediu R$ ' || translate(to_char(new.amount, 'FM999G999G990D00'), ',.', '.,'),
      v_base || jsonb_build_object(
        'Idade da conta', justify_interval(date_trunc('minute', new.created_at - v_account_created))::text
      )
    );
  end if;

  -- 4. chave PIX cadastrada ou já usada em saque por outra conta
  if v_key is not null then
    select string_agg(distinct e, ', ')
      into v_others
    from (
      select p.email as e
        from profiles p
       where p.id <> new.user_id
         and normalize_pix_key(p.pix_key, p.pix_key_type::text) = v_key
      union
      select p.email
        from withdrawals w
        join profiles p on p.id = w.user_id
       where w.user_id <> new.user_id
         and normalize_pix_key(w.pix_key, w.pix_key_type::text) = v_key
    ) x;

    if v_others is not null then
      perform raise_security_alert(
        'withdrawal_shared_pix',
        'critical',
        'Saque para chave PIX de outra conta: ' || coalesce(v_email, new.user_id::text),
        v_base || jsonb_build_object('Outras contas com essa chave', v_others)
      );
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists alert_withdrawal_requested on withdrawals;
create trigger alert_withdrawal_requested
  after insert on withdrawals
  for each row execute function alert_withdrawal_requested();

-- -----------------------------------------------------------------------------
-- Gatilho 5 — senha/email de conta da equipe
-- -----------------------------------------------------------------------------

create or replace function alert_staff_credentials_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_what text[] := '{}';
begin
  select role::text into v_role from public.profiles where id = new.id;
  if v_role is null or v_role not in ('admin', 'campaign_admin') then
    return null;
  end if;

  if new.encrypted_password is distinct from old.encrypted_password then
    v_what := v_what || 'senha alterada'::text;
  end if;
  if new.email is distinct from old.email then
    v_what := v_what || ('email alterado: ' || coalesce(old.email, '?') || ' → ' || coalesce(new.email, '?'));
  end if;
  if coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change then
    v_what := v_what || ('pedido de troca de email para ' || new.email_change);
  end if;

  if array_length(v_what, 1) is null then
    return null;
  end if;

  perform public.raise_security_alert(
    'staff_credentials',
    'critical',
    'Credenciais de conta da equipe alteradas: ' || coalesce(old.email, new.id::text),
    jsonb_build_object(
      'Conta', coalesce(old.email, new.id::text),
      'Cargo', v_role,
      'O que mudou', array_to_string(v_what, '; '),
      'Se não foi a própria pessoa', 'Trocar a senha imediatamente e encerrar as sessões dessa conta.'
    )
  );
  return null;
end;
$$;

drop trigger if exists alert_staff_credentials_change on auth.users;
create trigger alert_staff_credentials_change
  after update on auth.users
  for each row
  when (
       old.encrypted_password is distinct from new.encrypted_password
    or old.email              is distinct from new.email
    or old.email_change       is distinct from new.email_change
  )
  execute function public.alert_staff_credentials_change();

-- -----------------------------------------------------------------------------
-- Gatilho 6 — admin novo mexendo em dinheiro
-- -----------------------------------------------------------------------------

create or replace function alert_recent_staff_money_action()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_target uuid;
  v_target_email text;
  v_campaign text;
  v_extra text := '';
begin
  if auth.uid() is null or not is_recent_staff(auth.uid()) then
    return null;
  end if;

  if tg_table_name = 'balance_credits' then
    v_target := new.user_id;
    v_action := case when tg_op = 'INSERT' then 'gerou saldo' else 'liberou saldo' end;
    v_extra := 'R$ ' || translate(to_char(new.amount, 'FM999G999G990D00'), ',.', '.,');
    select title into v_campaign from campaigns where id = new.campaign_id;
  elsif tg_table_name = 'applications' then
    v_target := new.user_id;
    v_action := 'aprovou inscrição';
    select title into v_campaign from campaigns where id = new.campaign_id;
  elsif tg_table_name = 'withdrawals' then
    v_target := new.user_id;
    v_action := case new.status::text
      when 'paid' then 'marcou saque como pago'
      when 'flagged' then 'notificou divergência em saque'
      else 'alterou saque' end;
    v_extra := 'R$ ' || translate(to_char(new.amount, 'FM999G999G990D00'), ',.', '.,');
  end if;

  select email into v_target_email from profiles where id = v_target;

  perform raise_security_alert(
    'recent_staff_money',
    'critical',
    'Admin recém-criado mexendo em dinheiro: ' || security_actor_label() || ' ' || v_action,
    jsonb_build_object(
      'Ação', v_action,
      'Criador afetado', coalesce(v_target_email, v_target::text),
      'Campanha', coalesce(v_campaign, '—'),
      'Valor', nullif(v_extra, ''),
      'Agrupamento', 'Novas ações da mesma conta nos próximos 30 min não geram outro email — veja a tabela security_alerts (coluna occurrences).',
      'Link', 'https://poplinecreators.com.br/admin'
    ),
    'recent_staff_money:' || auth.uid()::text
  );
  return null;
end;
$$;

drop trigger if exists alert_recent_staff_money_credit_insert on balance_credits;
create trigger alert_recent_staff_money_credit_insert
  after insert on balance_credits
  for each row execute function alert_recent_staff_money_action();
drop trigger if exists alert_recent_staff_money_credit_release on balance_credits;
create trigger alert_recent_staff_money_credit_release
  after update on balance_credits
  for each row
  when (old.status = 'processing' and new.status = 'available')
  execute function alert_recent_staff_money_action();

drop trigger if exists alert_recent_staff_money_application on applications;
create trigger alert_recent_staff_money_application
  after update on applications
  for each row
  when (old.status is distinct from new.status and new.status = 'approved')
  execute function alert_recent_staff_money_action();

drop trigger if exists alert_recent_staff_money_withdrawal on withdrawals;
create trigger alert_recent_staff_money_withdrawal
  after update on withdrawals
  for each row
  when (old.status is distinct from new.status and new.status in ('paid', 'flagged'))
  execute function alert_recent_staff_money_action();

-- -----------------------------------------------------------------------------
-- Entrega: pg_net na hora + pg_cron de reforço
-- -----------------------------------------------------------------------------

create or replace function dispatch_security_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://poplinecreators.com.br/api/security/alerts/dispatch',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return null;
exception when others then
  raise warning 'dispatch_security_alerts falhou: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists dispatch_security_alerts on security_alerts;
create trigger dispatch_security_alerts
  after insert on security_alerts
  for each statement execute function dispatch_security_alerts();

-- Reivindica pendentes de forma atômica (skip locked) para a rota enviar.
-- Reivindicação expira em 2 min, então falha no meio do envio é retentada.
create or replace function claim_security_alerts(p_limit integer default 20)
returns setof security_alerts
language sql security definer set search_path = public as $$
  update security_alerts s
     set claimed_at = now(),
         attempts = attempts + 1
   where s.id in (
     select id from security_alerts
      where sent_at is null
        and attempts < 10
        and (claimed_at is null or claimed_at < now() - interval '2 minutes')
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning s.*;
$$;

revoke all on function claim_security_alerts(integer) from public, anon, authenticated;
grant execute on function claim_security_alerts(integer) to service_role;

do $$
begin
  perform cron.unschedule('security-alerts-dispatch')
   where exists (select 1 from cron.job where jobname = 'security-alerts-dispatch');
  perform cron.schedule(
    'security-alerts-dispatch',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := 'https://poplinecreators.com.br/api/security/alerts/dispatch',
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 10000
      )
      where exists (
        select 1 from public.security_alerts
         where sent_at is null and attempts < 10
      );
    $job$
  );
end;
$$;

notify pgrst, 'reload schema';
