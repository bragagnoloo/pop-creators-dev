import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import PlanRenewalReminderEmail from '@/emails/plan-renewal-reminder';
import { PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc('get_subscriptions_expiring_in_24h');

  // Fallback: query direta se a RPC não existir
  const rows = data ?? await fetchExpiringSubscriptions();

  if (error && !data) {
    console.error('[cron/renewal-reminder] erro ao buscar assinaturas', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let sent = 0;
  for (const row of rows) {
    const plan = PLANS[row.plan as PlanId];
    if (!plan || plan.id === 'free') continue;
    const expiresAt = new Date(row.expires_at).toLocaleDateString('pt-BR');
    await sendEmail(
      row.email,
      `Seu plano ${plan.name} vence amanhã — renove para manter o acesso`,
      React.createElement(PlanRenewalReminderEmail, {
        fullName: row.full_name,
        planName: plan.name,
        expiresAt,
      }),
    );
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

async function fetchExpiringSubscriptions() {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, expires_at, profiles!inner(email, full_name)')
    .neq('plan', 'free')
    .gte('expires_at', new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString())
    .lte('expires_at', new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString());

  if (!data) return [];
  type ProfileJoin = { email: string; full_name: string };
  return (data as unknown as { user_id: string; plan: string; expires_at: string; profiles: ProfileJoin }[])
    .map(row => ({
      user_id: row.user_id,
      plan: row.plan,
      expires_at: row.expires_at,
      email: row.profiles.email,
      full_name: row.profiles.full_name,
    }));
}
