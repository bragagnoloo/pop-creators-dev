import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  ACCESS_COOKIE, ACCESS_COOKIE_PATH, isTokenShape, peekToken, claimToken, releaseToken,
  needsFirstAccess, maskEmail,
} from '@/lib/purchase-access';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function clearAccessCookie(res: NextResponse): NextResponse {
  res.cookies.set(ACCESS_COOKIE, '', { path: ACCESS_COOKIE_PATH, maxAge: 0 });
  return res;
}

/**
 * Estado do link guardado no cookie, sem consumir: para qual conta é (e-mail
 * mascarado) e se o navegador já está logado em OUTRA conta.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!isTokenShape(raw)) return NextResponse.json({ state: 'invalid' });

  const admin = createAdminClient();
  const token = await peekToken(admin, raw);
  if (!token) return clearAccessCookie(NextResponse.json({ state: 'invalid' }));

  const { data } = await admin.auth.admin.getUserById(token.user_id);
  if (!data.user?.email || !needsFirstAccess(data.user)) {
    return clearAccessCookie(NextResponse.json({ state: 'invalid' }));
  }

  const supabase = await createClient();
  const { data: current } = await supabase.auth.getUser();
  const conflict = current.user && current.user.id !== data.user.id && current.user.email
    ? maskEmail(current.user.email)
    : null;

  return NextResponse.json({ state: 'ready', email: maskEmail(data.user.email), conflict });
}

/**
 * Consome o token e abre a sessão da conta (cookies do Supabase). Se outra conta
 * estiver logada, só segue com `confirmSwitch: true`.
 */
export async function POST(req: NextRequest) {
  // Cookie SameSite=Lax já não viaja em POST de outro site; o Origin fecha o resto.
  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rl = await checkRateLimit(`primeiro-acesso:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const raw = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!isTokenShape(raw)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { confirmSwitch } = (await req.json().catch(() => ({}))) as { confirmSwitch?: boolean };
  const admin    = createAdminClient();
  const supabase = await createClient();

  const peeked = await peekToken(admin, raw);
  if (!peeked) return clearAccessCookie(NextResponse.json({ error: 'invalid' }, { status: 400 }));

  const { data: current } = await supabase.auth.getUser();
  if (current.user && current.user.id !== peeked.user_id && !confirmSwitch) {
    return NextResponse.json({ error: 'conflict' }, { status: 409 });
  }

  const token = await claimToken(admin, raw);
  if (!token) return clearAccessCookie(NextResponse.json({ error: 'invalid' }, { status: 400 }));

  const { data: target } = await admin.auth.admin.getUserById(token.user_id);
  const email = target.user?.email;
  if (!target.user || !email || !needsFirstAccess(target.user)) {
    // Quem já entrou (Google, "esqueci a senha"…) não usa mais este link.
    return clearAccessCookie(NextResponse.json({ error: 'invalid' }, { status: 400 }));
  }

  // Magic link gerado no servidor e verificado na hora: a sessão vai direto para
  // os cookies, sem passar pelo navegador (o PKCE do cliente não entra aqui).
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const hashed = link?.properties?.hashed_token;
  if (linkError || !hashed) {
    console.error('[primeiro-acesso] generateLink falhou', token.user_id, linkError);
    await releaseToken(admin, token.id);
    return NextResponse.json({ error: 'retry' }, { status: 503 });
  }

  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: hashed, type: 'email' });
  if (otpError) {
    console.error('[primeiro-acesso] verifyOtp falhou', token.user_id, otpError);
    await releaseToken(admin, token.id);
    return NextResponse.json({ error: 'retry' }, { status: 503 });
  }

  return clearAccessCookie(NextResponse.json({ ok: true, redirect: '/primeiro-acesso/senha' }));
}
