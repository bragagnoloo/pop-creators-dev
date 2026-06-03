import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendCAPIEvents, sha256 } from '@/lib/meta-capi';
import { ROUTES } from '@/lib/constants';

const WEBHOOK_URL = 'https://webhook.mktarmy.com.br/webhook/cadastro-popline-creators';
const NEW_SIGNUP_THRESHOLD_MS = 30_000;

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange`);
  }

  const user = data.user;
  const userAgeMs = Date.now() - new Date(user.created_at).getTime();
  const isNewSignup = userAgeMs < NEW_SIGNUP_THRESHOLD_MS;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (isNewSignup) {
    const meta = user.user_metadata ?? {};
    const fullName = String(meta.full_name ?? meta.name ?? '').trim();
    const avatarUrl = String(meta.avatar_url ?? meta.picture ?? '');
    const fbp = req.cookies.get('_fbp')?.value;
    const fbc = req.cookies.get('_fbc')?.value;
    const userAgent = req.headers.get('user-agent') ?? undefined;
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;

    const updates: Record<string, string> = {};
    if (fullName) updates.full_name = fullName;
    if (avatarUrl) updates.photo_url = avatarUrl;
    if (fbp) updates.meta_fbp = fbp;
    if (fbc) updates.meta_fbc = fbc;
    if (userAgent) updates.meta_user_agent = userAgent;
    if (Object.keys(updates).length) {
      await admin.from('profiles').update(updates).eq('id', user.id);
    }

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: fullName,
        email: user.email ?? '',
        telefone: '',
      }),
    }).catch(() => {});

    const names = fullName.split(' ').filter(Boolean);
    sendCAPIEvents([{
      event_name: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: user.id,
      event_source_url: `${origin}/auth/callback`,
      action_source: 'website',
      user_data: {
        em: sha256(user.email ?? ''),
        ...(names[0] && { fn: sha256(names[0].toLowerCase()) }),
        ...(names.length > 1 && { ln: sha256(names[names.length - 1].toLowerCase()) }),
        country: sha256('br'),
        external_id: sha256(user.id),
        ...(fbp && { fbp }),
        ...(fbc && { fbc }),
        ...(ip && { client_ip_address: ip }),
        ...(userAgent && { client_user_agent: userAgent }),
      },
    }]).catch(() => {});
  }

  const role = profile?.role;
  const dest = role === 'admin'
    ? ROUTES.ADMIN
    : role === 'campaign_admin'
      ? ROUTES.ADMIN_CAMPAIGNS
      : ROUTES.DASHBOARD;

  return NextResponse.redirect(`${origin}${dest}`);
}
