import { createHash, randomBytes } from 'node:crypto';
import { after } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import PurchaseAccessEmail, { type PurchaseAccessVariant } from '@/emails/purchase-access';

// =============================================================================
// Fluxo alternativo de assinatura: conta criada pela compra.
//
// Quando a Hotmart aprova uma compra de um e-mail sem conta (comprador de
// afiliado, ou quem trocou o e-mail no checkout), o webhook cria a conta com o
// plano ativo e manda um e-mail com link de primeiro acesso. Quem se cadastrou,
// nunca confirmou o e-mail e depois comprou entra no mesmo caminho.
//
// Criar a conta NÃO envia e-mail: quem chama decide, depois de saber se a
// pessoa já consegue entrar. Assim dois eventos da mesma compra não mandam
// mensagens que se contradizem.
//
// A marca "primeiro acesso pendente" fica em app_metadata, gravada junto com o
// usuário (createUser) e fora do alcance do próprio usuário. Se o webhook cair
// no meio, o reenvio da Hotmart ainda encontra a marca e conclui o fluxo.
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br';
const FROM_NAMED = `Rodrigo da POPline <${FROM}>`;
// Recebe as respostas do comprador (reply-to) e os alertas de venda travada.
const SUPPORT_EMAIL = process.env.SUPORTE_EMAIL ?? 'poplinecreators@gmail.com';

const MKTARMY_URL = 'https://webhook.mktarmy.com.br/webhook/cadastro-popline-creators';

export const APP_URL = process.env.APP_URL ?? 'https://poplinecreators.com.br';
export const COMMUNITY_URL = 'https://chat.whatsapp.com/Hims22XDcjQL8N9AwV7dI3';
export const ACCESS_COOKIE = 'pa_token';
export const ACCESS_COOKIE_PATH = '/api/primeiro-acesso';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AccessOrigin = 'purchase' | 'unconfirmed_signup';

export type Buyer = {
  email: string;
  name: string | null;
  phone: string | null;
  transaction: string | null;
};

type ProfileFields = { id: string; full_name: string | null; whatsapp: string | null };

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------

/** Telefone da Hotmart → máscara do cadastro "(11) 99999-9999". '' se não der. */
export function normalizePhone(raw: string | null | undefined): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return '';
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (user.length <= 4) return `${user.slice(0, 1)}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-2)}@${domain}`;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Formato do token emitido por issueToken (32 bytes em base64url). */
export function isTokenShape(raw: string | null | undefined): raw is string {
  return !!raw && /^[A-Za-z0-9_-]{43}$/.test(raw);
}

function originOf(user: User): AccessOrigin | null {
  const o = user.app_metadata?.origin;
  return o === 'purchase' || o === 'unconfirmed_signup' ? o : null;
}

/** Ainda não entrou nenhuma vez numa conta deste fluxo. */
export function needsFirstAccess(user: User): boolean {
  return user.app_metadata?.first_access_pending === true && !user.last_sign_in_at;
}

/** Cadastro feito pelo site que nunca confirmou o e-mail nem entrou. */
export function isUnconfirmedSignup(user: User): boolean {
  return !user.email_confirmed_at && !user.last_sign_in_at;
}

export function accessVariant(user: User, isRenewal: boolean): PurchaseAccessVariant {
  if (originOf(user) === 'unconfirmed_signup') return 'unconfirmed';
  return isRenewal ? 'renewal' : 'new';
}

// -----------------------------------------------------------------------------
// Conta
// -----------------------------------------------------------------------------

export type EnsureResult =
  | { kind: 'ok'; profileId: string; user: User; created: boolean }
  | { kind: 'permanent'; reason: string }
  | { kind: 'transient'; reason: string };

/**
 * Cria a conta de quem comprou sem cadastro. Sem senha: a pessoa define a dela
 * no primeiro acesso, e a política de senha do projeto não interfere.
 *
 * - permanent: não adianta tentar de novo (e-mail inválido, e-mail que existe no
 *   Auth sem perfil correspondente). O webhook volta ao comportamento antigo.
 * - transient: rede/5xx. O webhook responde 500 para a Hotmart reenviar.
 */
export async function ensurePurchaseAccount(admin: SupabaseClient, buyer: Buyer): Promise<EnsureResult> {
  const { data, error } = await admin.auth.admin.createUser({
    email: buyer.email,
    email_confirm: true,
    app_metadata: { first_access_pending: true, origin: 'purchase', transaction: buyer.transaction },
  });

  if (error || !data.user) {
    const code = error?.code ?? '';
    const status = error?.status ?? 0;

    // Reenvio concorrente da mesma venda: o outro request criou a conta. Nem
    // sempre vem como email_exists: se os dois inserts correm juntos, a
    // unicidade estoura no trigger e o Auth devolve um 500 genérico
    // ("Database error creating new user"). Por isso a conta é procurada antes
    // de classificar qualquer falha.
    const { data: profile } = await admin.from('profiles').select('id').eq('email', buyer.email).maybeSingle();
    if (profile) {
      const { data: existing } = await admin.auth.admin.getUserById(profile.id);
      if (existing.user) return { kind: 'ok', profileId: profile.id, user: existing.user, created: false };
    }

    if (code === 'email_exists' || /already been registered/i.test(error?.message ?? '')) {
      return { kind: 'permanent', reason: `createUser ${code}: e-mail existe no Auth sem perfil correspondente` };
    }
    if (status >= 400 && status < 500) return { kind: 'permanent', reason: `createUser ${code || status}: ${error?.message}` };
    return { kind: 'transient', reason: `createUser ${code || status}: ${error?.message ?? 'sem usuário'}` };
  }

  return { kind: 'ok', profileId: data.user.id, user: data.user, created: true };
}

/** Marca um cadastro não confirmado para o primeiro acesso (e confirma o e-mail). */
export async function markUnconfirmedForAccess(admin: SupabaseClient, user: User): Promise<User | null> {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
    app_metadata: { ...user.app_metadata, first_access_pending: true, origin: 'unconfirmed_signup' },
  });
  if (error || !data.user) {
    console.error('[purchase-access] falha ao marcar cadastro não confirmado', user.id, error);
    return null;
  }
  return data.user;
}

/**
 * Completa nome/WhatsApp do perfil (só o que estiver vazio: não sobrescreve o
 * que a pessoa preencheu no cadastro) e garante o registro em purchase_access.
 * Idempotente: roda de novo em cada reenvio sem efeito colateral.
 */
export async function syncPurchaseRecord(
  admin: SupabaseClient,
  profile: ProfileFields,
  user: User,
  buyer: Buyer,
): Promise<void> {
  const patch: Record<string, string> = {};
  if (!profile.full_name?.trim() && buyer.name?.trim()) patch.full_name = buyer.name.trim();
  const phone = normalizePhone(buyer.phone);
  if (!profile.whatsapp?.trim() && phone) patch.whatsapp = phone;
  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('profiles').update(patch).eq('id', profile.id);
    if (error) console.error('[purchase-access] falha ao completar perfil', profile.id, error);
  }

  const { error } = await admin.from('purchase_access').upsert(
    {
      user_id:     profile.id,
      origin:      originOf(user) ?? 'purchase',
      transaction: buyer.transaction,
      buyer_name:  buyer.name,
      buyer_phone: buyer.phone,
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
  if (error) console.error('[purchase-access] falha ao gravar purchase_access', profile.id, error);
}

// -----------------------------------------------------------------------------
// Token de primeiro acesso
// -----------------------------------------------------------------------------

/** Emite um token novo e invalida os anteriores (só o link mais recente vale). */
async function issueToken(admin: SupabaseClient, userId: string): Promise<string> {
  const now = new Date().toISOString();
  await admin.from('account_access_tokens').update({ used_at: now }).eq('user_id', userId).is('used_at', null);

  const raw = randomBytes(32).toString('base64url');
  const { error } = await admin.from('account_access_tokens').insert({
    user_id:    userId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`falha ao gravar token: ${error.message}`);
  return raw;
}

/** Token válido (não usado, não expirado), sem consumir. */
export async function peekToken(admin: SupabaseClient, raw: string): Promise<{ id: string; user_id: string } | null> {
  const { data } = await admin
    .from('account_access_tokens')
    .select('id, user_id')
    .eq('token_hash', hashToken(raw))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data ?? null;
}

/** Consome o token numa única instrução: dois cliques nunca levam os dois. */
export async function claimToken(admin: SupabaseClient, raw: string): Promise<{ id: string; user_id: string } | null> {
  const now = new Date().toISOString();
  const { data } = await admin
    .from('account_access_tokens')
    .update({ used_at: now })
    .eq('token_hash', hashToken(raw))
    .is('used_at', null)
    .gt('expires_at', now)
    .select('id, user_id')
    .maybeSingle();
  return data ?? null;
}

/** Devolve o token se o login falhou depois do claim, para a pessoa tentar de novo. */
export async function releaseToken(admin: SupabaseClient, id: string): Promise<void> {
  await admin.from('account_access_tokens').update({ used_at: null }).eq('id', id);
}

// -----------------------------------------------------------------------------
// E-mails
// -----------------------------------------------------------------------------

export type AccessEmailInput = {
  userId: string;
  email: string;
  fullName: string;
  planName: string;
  expiresAt: string;
  variant: PurchaseAccessVariant;
  transaction: string | null;
};

const SUBJECTS: Record<PurchaseAccessVariant, string> = {
  new:         'Sua conta na POPline Creators está pronta: veja como acessar',
  unconfirmed: 'Seu plano está ativo: veja como acessar sua conta',
  renewal:     'Seu plano foi renovado: falta só acessar sua conta',
};

/**
 * Gera um link novo e manda o e-mail de acesso pelo Resend. O resultado fica em
 * purchase_access; falha vira alerta para a equipe. Nunca lança.
 */
export async function sendAccessEmail(admin: SupabaseClient, input: AccessEmailInput): Promise<boolean> {
  let errorMessage: string | null = null;

  try {
    const token = await issueToken(admin, input.userId);
    const html = await render(
      PurchaseAccessEmail({
        fullName:     input.fullName,
        email:        input.email,
        planName:     input.planName,
        expiresAt:    input.expiresAt,
        accessUrl:    `${APP_URL}/api/primeiro-acesso/abrir?t=${token}`,
        communityUrl: COMMUNITY_URL,
        variant:      input.variant,
        canReply:     !!SUPPORT_EMAIL,
      }),
    );
    // O Resend devolve { error } em vez de lançar: sem checar, a falha some.
    const { data, error } = await resend.emails.send({
      from: FROM_NAMED,
      to: input.email,
      subject: SUBJECTS[input.variant],
      html,
      ...(SUPPORT_EMAIL ? { replyTo: SUPPORT_EMAIL } : {}),
    });
    if (error || !data?.id) errorMessage = error?.message ?? 'Resend não devolveu id de envio';
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const ok = errorMessage === null;
  await admin
    .from('purchase_access')
    .update({
      email_status: ok ? 'sent' : 'failed',
      email_error:  errorMessage,
      last_sent_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId);

  if (!ok) {
    console.error('[purchase-access] e-mail de acesso falhou', input.userId, errorMessage);
    alertStuckSale({
      motivo:     `E-mail de acesso não enviado: ${errorMessage}`,
      email:      input.email,
      transacao:  input.transaction,
      usuario:    input.userId,
    });
  }
  return ok;
}

/**
 * Alerta de "venda travou" para a equipe. Roda depois da resposta (after) para
 * não atrasar o webhook, e nunca derruba o fluxo.
 */
export function alertStuckSale(info: Record<string, string | null | undefined>): void {
  const to = process.env.ALERTA_VENDAS_EMAIL ?? SUPPORT_EMAIL;
  console.error('[purchase-access] venda travou', info);
  if (!to) return;

  after(async () => {
    try {
      const rows = Object.entries(info)
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${escapeHtml(v ?? '—')}</td></tr>`)
        .join('');
      const { error } = await resend.emails.send({
        from: `POPline Creators <${FROM}>`,
        to,
        subject: 'Venda travou: comprador pode estar sem acesso',
        html: `<p>Uma compra aprovada na Hotmart não completou o fluxo de acesso.</p><table>${rows}</table>`,
      });
      if (error) console.error('[purchase-access] alerta não enviado', error);
    } catch (err) {
      console.error('[purchase-access] alerta não enviado', err);
    }
  });
}

/** Lead da compra no CRM, igual ao cadastro pelo site (sem CompleteRegistration). */
export function sendLeadToMktarmy(buyer: Buyer): void {
  after(async () => {
    try {
      await fetch(MKTARMY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: buyer.name ?? '', email: buyer.email, telefone: normalizePhone(buyer.phone) }),
      });
    } catch {
      // Falha no CRM não afeta o acesso
    }
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
