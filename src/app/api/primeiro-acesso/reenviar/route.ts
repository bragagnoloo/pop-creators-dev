import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLANS } from '@/services/subscriptions';
import { needsFirstAccess, sendAccessEmail, accessVariant } from '@/lib/purchase-access';
import type { PlanId } from '@/types';

const MIN_RESPONSE_MS = 3000;

// Pedido de link novo na tela de link expirado. Responde SEMPRE igual, exista a
// conta ou não, para a tela não virar um verificador de quem é assinante.
// Roda antes da resposta (não em after): o "esqueci a senha" grava no navegador
// o cookie do PKCE, e sem ele o link de redefinição não abre.
// - conta ainda no primeiro acesso → link novo pelo Resend;
// - qualquer outra → o "esqueci a senha" de sempre.
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const { email: rawEmail } = (await req.json().catch(() => ({}))) as { email?: string };
  const email = rawEmail?.toLowerCase().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: true });

  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`primeiro-acesso-reenviar:${ip}`, 5, 60 * 60 * 1000),
    checkRateLimit(`primeiro-acesso-reenviar:${email}`, 3, 60 * 60 * 1000),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  // Tempo mínimo de resposta: sem ele, um e-mail sem conta volta em 0,2 s e um
  // com conta em 1–2 s, e a diferença entrega quem é assinante.
  const started = Date.now();

  await (async () => {
    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('id, full_name').eq('email', email).maybeSingle();
    if (!profile) return;

    const { data: auth } = await admin.auth.admin.getUserById(profile.id);
    if (auth.user && needsFirstAccess(auth.user)) {
      const { data: sub } = await admin.from('subscriptions').select('plan, expires_at').eq('user_id', profile.id).maybeSingle();
      const plan = (sub?.plan as PlanId | undefined) ?? 'free';
      await sendAccessEmail(admin, {
        userId:      profile.id,
        email,
        fullName:    profile.full_name ?? '',
        planName:    PLANS[plan].name,
        expiresAt:   sub?.expires_at
          ? new Date(sub.expires_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : '—',
        variant:     accessVariant(auth.user, false),
        transaction: null,
      });
      return;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://poplinecreators.com.br/login/nova-senha',
    });
    if (error) console.error('[primeiro-acesso] reset falhou', error);
  })().catch(err => console.error('[primeiro-acesso] reenviar falhou', err));

  const wait = MIN_RESPONSE_MS - (Date.now() - started);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  return NextResponse.json({ ok: true });
}
