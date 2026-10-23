/**
 * Testes de permissão contra a API real (PostgREST + RLS + triggers), do jeito
 * que o invasor de 2026-10-10→13 atacou: anon key + JWT de uma conta comum.
 *
 * Cada teste tenta algo que NÃO deveria funcionar. Quando a ação de escrita é
 * aceita, o estado é conferido pelo service role (fonte da verdade) e desfeito
 * no cleanup. Ações destrutivas em dados reais (apagar campanha etc.) ficam de
 * fora de propósito: se a regra estivesse quebrada, o teste causaria o estrago.
 *
 * Contas de teste (criadas sob demanda, login por magic link gerado no servidor
 * — sem trocar senha, então não disparam o alerta de credenciais):
 *   - creator  : criador comum, o "atacante"
 *   - victim   : criador comum, o "alvo"
 *   - camp     : admin de campanha SEM campanha atribuída — só durante a
 *                execução; em repouso é creator, para não deixar parada em
 *                produção uma conta que lê todos os perfis
 */

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ACCOUNTS = {
  creator: { email: 'qa-security-creator@poplinecreators.com.br', name: '[TESTE SEGURANÇA] Criador', role: 'creator' },
  victim: { email: 'qa-security-victim@poplinecreators.com.br', name: '[TESTE SEGURANÇA] Vítima', role: 'creator' },
  // Fica como creator em repouso; vira campaign_admin só durante a execução
  // (ver runSecurityTests). O alerta de acesso ignora essa troca (0048).
  camp: { email: 'qa-security-campadmin@poplinecreators.com.br', name: '[TESTE SEGURANÇA] Admin de campanha', role: 'creator' },
} as const;

type AccountKey = keyof typeof ACCOUNTS;

export type SecurityTestResult = {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
};

type Ctx = {
  admin: SupabaseClient;
  anon: SupabaseClient;
  creator: SupabaseClient;
  camp: SupabaseClient;
  ids: Record<AccountKey, string>;
  victimCreatedAt: string;
  campaignId: string;
  origin: string;
};

function client(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

function adminClient(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function ensureAccount(admin: SupabaseClient, key: AccountKey): Promise<{ id: string; createdAt: string }> {
  const spec = ACCOUNTS[key];
  const { data: existing } = await admin
    .from('profiles')
    .select('id, role, full_name, created_at')
    .eq('email', spec.email)
    .maybeSingle();

  let id = existing?.id as string | undefined;
  let createdAt = existing?.created_at as string | undefined;

  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`não consegui criar ${spec.email}: ${error?.message}`);
    id = data.user.id;
    createdAt = data.user.created_at;
  }

  // Só escreve o que estiver diferente: mudar role à toa dispararia o alerta
  // de "mudança de acesso ao painel" a cada execução.
  const patch: Record<string, unknown> = {};
  if (existing?.full_name !== spec.name) patch.full_name = spec.name;
  if (existing?.role !== spec.role) patch.role = spec.role;
  if (!existing) patch.onboarding_complete = true;
  if (Object.keys(patch).length > 0) {
    await admin.from('profiles').update(patch).eq('id', id);
  }
  return { id, createdAt: createdAt ?? new Date().toISOString() };
}

async function signIn(admin: SupabaseClient, key: AccountKey): Promise<SupabaseClient> {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ACCOUNTS[key].email });
  if (error || !data.properties?.hashed_token) throw new Error(`magic link falhou para ${key}: ${error?.message}`);
  const c = client();
  const { error: verifyError } = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'email' });
  if (verifyError) throw new Error(`login de teste falhou para ${key}: ${verifyError.message}`);
  return c;
}

// ---------------------------------------------------------------------------
// Helpers de asserção
// ---------------------------------------------------------------------------

type Res = { data: unknown; error: { message: string } | null };

const rows = (r: Res) => (Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0);
const denied = (r: Res) => !!r.error || rows(r) === 0;
const describe = (r: Res) => (r.error ? `erro: ${r.error.message}` : `${rows(r)} linha(s) retornada(s)`);

function rpcDenied(r: Res): boolean {
  if (r.error) return true;
  const d = r.data;
  if (Array.isArray(d)) return d.length === 0;
  if (d && typeof d === 'object' && 'success' in d) return (d as { success?: boolean }).success === false;
  return d === null || d === 0;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

type Test = { id: string; description: string; run: (ctx: Ctx) => Promise<{ passed: boolean; detail: string }> };

// Funções que contas logadas podem executar (migration 0049). Função nova que
// o app precise chamar com o JWT do usuário: conceder EXECUTE na migration E
// adicionar aqui — senão o teste diário alerta. Visitante (anon) não executa nada.
const AUTHENTICATED_FUNCTIONS = [
  'add_campaign_guest', 'apply_with_term', 'can_manage_campaign', 'clear_delivery_content_url',
  'complete_stage', 'create_notice', 'disqualify_participant', 'flag_withdrawal',
  'get_admin_application_stats', 'get_admin_user_ranks', 'get_ai_usage_current_month',
  'get_alltime_ranking', 'get_campaign_archive_impact', 'get_creator_publication_schedule',
  'get_lesson_comments', 'get_monthly_ranking', 'get_user_ranking_stats', 'init_campaign_schedule',
  'is_admin', 'is_any_admin', 'is_campaign_participant', 'is_master_admin', 'mark_joined_group',
  'record_daily_login', 'remove_campaign_guest', 'request_delivery_revision',
  'request_publication_revision', 'request_withdrawal', 'restore_campaign', 'revert_stage',
  'set_campaign_assigned_admin', 'set_deliverable_status', 'set_publication_schedule',
  'set_publication_status', 'set_stage_deadline', 'soft_delete_campaign', 'stage_readiness',
];

const TESTS: Test[] = [
  // ---- Quem pode executar funções do banco ----
  {
    id: 'grants.anon_functions',
    description: 'Visitante sem login não executa nenhuma função do banco',
    run: async ({ admin }) => {
      const { data, error } = await admin.rpc('audit_function_grants');
      if (error) return { passed: false, detail: `erro: ${error.message}` };
      const open = (data as { signature: string; anon: boolean }[]).filter(f => f.anon).map(f => f.signature);
      return { passed: open.length === 0, detail: open.length ? `abertas: ${open.join(', ')}` : 'nenhuma' };
    },
  },
  {
    id: 'grants.authenticated_functions',
    description: 'Contas logadas só executam as funções da lista permitida',
    run: async ({ admin }) => {
      const { data, error } = await admin.rpc('audit_function_grants');
      if (error) return { passed: false, detail: `erro: ${error.message}` };
      const extra = (data as { name: string; signature: string; authenticated: boolean }[])
        .filter(f => f.authenticated && !AUTHENTICATED_FUNCTIONS.includes(f.name))
        .map(f => f.signature);
      return {
        passed: extra.length === 0,
        detail: extra.length ? `fora da lista: ${extra.join(', ')}` : `${AUTHENTICATED_FUNCTIONS.length} permitidas`,
      };
    },
  },

  // ---- Controles positivos: se falharem, a suíte não está medindo nada ----
  {
    id: 'control.creator_reads_own_profile',
    description: 'Controle: criador consegue ler o próprio perfil',
    run: async ({ creator, ids }) => {
      const r = await creator.from('profiles').select('id').eq('id', ids.creator);
      return { passed: !r.error && rows(r) === 1, detail: describe(r) };
    },
  },

  // ---- Visitante sem login ----
  ...(['profiles', 'withdrawals', 'balance_credits', 'payments', 'subscriptions', 'audit_log', 'security_alerts', 'applications'] as const).map(
    (table): Test => ({
      id: `anon.read.${table}`,
      description: `Visitante sem login não lê ${table}`,
      run: async ({ anon }) => {
        const r = await anon.from(table).select('*').limit(1);
        return { passed: denied(r), detail: describe(r) };
      },
    })
  ),
  {
    id: 'anon.rpc.get_admin_ranking',
    description: 'Visitante sem login não lista ranking admin (emails/WhatsApp)',
    run: async ({ anon }) => {
      const r = await anon.rpc('get_admin_ranking');
      return { passed: rpcDenied(r), detail: describe(r) };
    },
  },
  {
    id: 'anon.register_complete.overwrite',
    description: 'Rota pública de cadastro não sobrescreve perfil de outra pessoa',
    run: async ({ admin, ids, origin, victimCreatedAt }) => {
      const before = await admin.from('profiles').select('full_name, whatsapp').eq('id', ids.victim).single();
      const attempts = [{ email: 'atacante@example.com' }];
      // Com o email certo só vale testar depois da janela de cadastro recente (30 min).
      if (Date.now() - new Date(victimCreatedAt).getTime() > 35 * 60 * 1000) {
        attempts.push({ email: ACCOUNTS.victim.email });
      }
      for (const a of attempts) {
        await fetch(`${origin}/api/register/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: ids.victim, email: a.email, whatsapp: '(00) 00000-0000', fullName: 'HACKED' }),
        });
      }
      const after = await admin.from('profiles').select('full_name, whatsapp').eq('id', ids.victim).single();
      const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
      return { passed: unchanged, detail: unchanged ? `perfil intacto (${attempts.length} tentativa(s))` : `perfil alterado: ${JSON.stringify(after.data)}` };
    },
  },

  // ---- Criador comum: escalada de privilégio ----
  ...([
    ['role', 'admin'],
    ['role', 'campaign_admin'],
    ['extra_admin_tabs', ['users', 'assinaturas']],
    ['email', 'outro@example.com'],
    ['kiwify_subscription_id', 'fake-sub'],
    ['first_subscribed_at', '2020-01-01T00:00:00Z'],
  ] as const).map(
    ([column, value]): Test => ({
      id: `creator.escalate.${column}.${String(value).split(',')[0]}`,
      description: `Criador não altera o próprio ${column}`,
      run: async ({ creator, admin, ids }) => {
        const before = await admin.from('profiles').select(column).eq('id', ids.creator).single();
        const r = await creator.from('profiles').update({ [column]: value }).eq('id', ids.creator).select('id');
        const after = await admin.from('profiles').select(column).eq('id', ids.creator).single();
        const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
        return { passed: unchanged, detail: unchanged ? describe(r) : `ALTERADO para ${JSON.stringify(after.data)}` };
      },
    })
  ),
  {
    id: 'creator.update_other_profile',
    description: 'Criador não altera perfil de outra pessoa',
    run: async ({ creator, admin, ids }) => {
      const before = await admin.from('profiles').select('full_name, pix_key').eq('id', ids.victim).single();
      const r = await creator.from('profiles').update({ full_name: 'HACKED', pix_key: 'atacante@example.com' }).eq('id', ids.victim).select('id');
      const after = await admin.from('profiles').select('full_name, pix_key').eq('id', ids.victim).single();
      const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
      return { passed: unchanged, detail: unchanged ? describe(r) : 'perfil da vítima ALTERADO' };
    },
  },

  // ---- Criador comum: leitura de dados alheios ----
  {
    id: 'creator.read.other_profiles',
    description: 'Criador não lê perfis de outras pessoas (PIX, endereço, WhatsApp)',
    run: async ({ creator, ids }) => {
      const r = await creator.from('profiles').select('id, pix_key').neq('id', ids.creator).limit(5);
      return { passed: denied(r), detail: describe(r) };
    },
  },
  ...(['withdrawals', 'balance_credits', 'payments', 'subscriptions', 'ai_usage'] as const).map(
    (table): Test => ({
      id: `creator.read.others.${table}`,
      description: `Criador não lê ${table} de outras pessoas`,
      run: async ({ creator, ids }) => {
        const r = await creator.from(table).select('user_id').neq('user_id', ids.creator).limit(5);
        return { passed: denied(r), detail: describe(r) };
      },
    })
  ),
  ...(['audit_log', 'security_alerts', 'purchase_access', 'account_access_tokens'] as const).map(
    (table): Test => ({
      id: `creator.read.${table}`,
      description: `Criador não lê ${table}`,
      run: async ({ creator }) => {
        const r = await creator.from(table).select('*').limit(1);
        return { passed: denied(r), detail: describe(r) };
      },
    })
  ),

  // ---- Criador comum: dinheiro ----
  {
    id: 'creator.credit.insert_available',
    description: 'Criador não cria saldo disponível para si mesmo',
    run: async ({ creator, ids, campaignId }) => {
      const r = await creator.from('balance_credits').insert({ user_id: ids.creator, campaign_id: campaignId, amount: 500, status: 'available' }).select('id');
      return { passed: !!r.error, detail: describe(r) };
    },
  },
  {
    id: 'creator.withdrawal.insert_direct',
    description: 'Criador não cria saque direto na tabela (sem saldo)',
    run: async ({ creator, ids }) => {
      const r = await creator.from('withdrawals').insert({ user_id: ids.creator, amount: 999, pix_key: 'x@example.com', pix_key_type: 'email', status: 'requested' }).select('id');
      return { passed: !!r.error, detail: describe(r) };
    },
  },
  {
    id: 'creator.withdrawal.rpc_without_balance',
    description: 'Criador não saca sem saldo pela função oficial',
    run: async ({ creator }) => {
      const r = await creator.rpc('request_withdrawal', { p_amount: 999 });
      return { passed: rpcDenied(r), detail: r.error ? describe(r) : JSON.stringify(r.data).slice(0, 120) };
    },
  },
  {
    id: 'creator.application.insert_approved',
    description: 'Criador não se inscreve já aprovado',
    run: async ({ creator, ids, campaignId }) => {
      const r = await creator.from('applications').insert({ user_id: ids.creator, campaign_id: campaignId, status: 'approved' }).select('id');
      return { passed: !!r.error, detail: describe(r) };
    },
  },
  {
    id: 'creator.subscription.self_upgrade',
    description: 'Criador não se dá plano pago',
    run: async ({ creator, admin, ids }) => {
      const before = await admin.from('subscriptions').select('plan, expires_at').eq('user_id', ids.creator).single();
      const r = await creator.from('subscriptions').update({ plan: 'yearly', expires_at: '2099-01-01T00:00:00Z' }).eq('user_id', ids.creator).select('user_id');
      const after = await admin.from('subscriptions').select('plan, expires_at').eq('user_id', ids.creator).single();
      const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
      return { passed: unchanged, detail: unchanged ? describe(r) : 'plano ALTERADO' };
    },
  },

  // ---- Criador comum: funções privilegiadas ----
  ...([
    ['get_admin_ranking', {}],
    ['get_admin_user_ranks', {}],
    ['check_rate_limit', { p_key: 'withdraw:qa', p_max: 1, p_window_ms: 1000 }],
    ['record_ai_call', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
    ['claim_security_alerts', { p_limit: 1 }],
    ['flag_withdrawal', { p_withdrawal_id: '00000000-0000-0000-0000-000000000000', p_reason: 'qa' }],
  ] as const).map(
    ([fn, args]): Test => ({
      id: `creator.rpc.${fn}`,
      description: `Criador não usa a função privilegiada ${fn}`,
      run: async ({ creator }) => {
        const r = await creator.rpc(fn, args);
        return { passed: rpcDenied(r), detail: r.error ? describe(r) : JSON.stringify(r.data).slice(0, 120) };
      },
    })
  ),

  // ---- Criador comum: arquivos ----
  ...([
    ['campaign-logos', () => 'qa-security-test.txt'],
    ['videos', () => 'qa-security-test.txt'],
    ['avatars', (ctx: Ctx) => `${ctx.ids.victim}/qa-security-test.txt`],
  ] as const).map(
    ([bucket, path]): Test => ({
      id: `creator.storage.${bucket}`,
      description: `Criador não envia arquivo para ${bucket === 'avatars' ? 'a pasta de avatar de outra pessoa' : `o bucket ${bucket}`}`,
      run: async (ctx) => {
        const p = path(ctx);
        const r = await ctx.creator.storage.from(bucket).upload(p, new Blob(['qa']), { upsert: true });
        if (!r.error) await ctx.admin.storage.from(bucket).remove([p]);
        return { passed: !!r.error, detail: r.error ? `erro: ${r.error.message}` : 'upload ACEITO (arquivo removido)' };
      },
    })
  ),

  // ---- Admin de campanha sem campanha atribuída ----
  {
    id: 'camp.update_unassigned_campaign',
    description: 'Admin de campanha não altera campanha que não é dele',
    run: async ({ camp, admin, campaignId }) => {
      const { data: c } = await admin.from('campaigns').select('title').eq('id', campaignId).single();
      // Mesmo valor: se a regra estiver quebrada, nada muda de fato, mas a linha volta.
      const r = await camp.from('campaigns').update({ title: c?.title }).eq('id', campaignId).select('id');
      return { passed: denied(r), detail: describe(r) };
    },
  },
  {
    id: 'camp.credit.insert',
    description: 'Admin de campanha não gera saldo em campanha que não é dele',
    run: async ({ camp, ids, campaignId }) => {
      const r = await camp.from('balance_credits').insert({ user_id: ids.creator, campaign_id: campaignId, amount: 150, status: 'processing' }).select('id');
      return { passed: !!r.error, detail: describe(r) };
    },
  },
  {
    id: 'camp.escalate.role',
    description: 'Admin de campanha não vira admin master',
    run: async ({ camp, admin, ids }) => {
      const r = await camp.from('profiles').update({ role: 'admin' }).eq('id', ids.camp).select('id');
      const after = await admin.from('profiles').select('role').eq('id', ids.camp).single();
      const ok = after.data?.role === 'campaign_admin';
      return { passed: ok, detail: ok ? describe(r) : `role ALTERADO para ${after.data?.role}` };
    },
  },
  ...(['withdrawals', 'audit_log', 'security_alerts'] as const).map(
    (table): Test => ({
      id: `camp.read.${table}`,
      description: `Admin de campanha não lê ${table}`,
      run: async ({ camp }) => {
        const r = await camp.from(table).select('*').limit(1);
        return { passed: denied(r), detail: describe(r) };
      },
    })
  ),
  {
    id: 'camp.rpc.flag_withdrawal',
    description: 'Admin de campanha não notifica divergência em saque',
    run: async ({ camp }) => {
      const r = await camp.rpc('flag_withdrawal', { p_withdrawal_id: '00000000-0000-0000-0000-000000000000', p_reason: 'qa' });
      return { passed: rpcDenied(r), detail: r.error ? describe(r) : JSON.stringify(r.data).slice(0, 120) };
    },
  },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function cleanup(admin: SupabaseClient, ids: Record<AccountKey, string>) {
  const testIds = Object.values(ids);
  // Desfaz qualquer coisa que um teste quebrado tenha conseguido criar.
  await admin.from('balance_credits').delete().in('user_id', testIds);
  await admin.from('withdrawals').delete().in('user_id', testIds);
  await admin.from('applications').delete().in('user_id', testIds);
  for (const key of Object.keys(ACCOUNTS) as AccountKey[]) {
    const spec = ACCOUNTS[key];
    const { data } = await admin.from('profiles').select('role, extra_admin_tabs, email').eq('id', ids[key]).single();
    const patch: Record<string, unknown> = {};
    if (data?.role !== spec.role) patch.role = spec.role;
    if ((data?.extra_admin_tabs ?? []).length > 0) patch.extra_admin_tabs = [];
    if (data?.email !== spec.email) patch.email = spec.email;
    if (Object.keys(patch).length > 0) await admin.from('profiles').update(patch).eq('id', ids[key]);
  }
  await admin.from('subscriptions').update({ plan: 'free', expires_at: null }).in('user_id', testIds).neq('plan', 'free');
}

export async function runSecurityTests(origin: string): Promise<{ results: SecurityTestResult[]; failed: number }> {
  const admin = adminClient();

  const creatorAcc = await ensureAccount(admin, 'creator');
  const victimAcc = await ensureAccount(admin, 'victim');
  const campAcc = await ensureAccount(admin, 'camp');
  const ids = { creator: creatorAcc.id, victim: victimAcc.id, camp: campAcc.id };

  // Admin de campanha de teste nunca pode ter campanha atribuída.
  await admin.from('admin_campaign_assignments').delete().eq('admin_id', ids.camp);

  const { data: campaign } = await admin.from('campaigns').select('id').is('deleted_at', null).limit(1).single();
  if (!campaign) throw new Error('nenhuma campanha disponível para os testes');

  const results: SecurityTestResult[] = [];
  let ctx: Ctx | null = null;
  try {
    // Promoção temporária; o cleanup no finally devolve a creator.
    await admin.from('profiles').update({ role: 'campaign_admin' }).eq('id', ids.camp);

    ctx = {
      admin,
      anon: client(),
      creator: await signIn(admin, 'creator'),
      camp: await signIn(admin, 'camp'),
      ids,
      victimCreatedAt: victimAcc.createdAt,
      campaignId: campaign.id,
      origin,
    };

    for (const t of TESTS) {
      try {
        const { passed, detail } = await t.run(ctx);
        results.push({ id: t.id, description: t.description, passed, detail });
      } catch (err) {
        results.push({ id: t.id, description: t.description, passed: false, detail: `exceção: ${(err as Error).message}` });
      }
    }
  } finally {
    await cleanup(admin, ids);
    if (ctx) await Promise.allSettled([ctx.creator.auth.signOut(), ctx.camp.auth.signOut()]);
  }

  return { results, failed: results.filter(r => !r.passed).length };
}
