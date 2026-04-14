import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface GuardResult {
  userId: string;
  email: string;
  role: 'creator' | 'admin';
  plan: string;
}

/**
 * Valida sessão + (opcional) exige plano pago. Retorna info do usuário ou Response de erro.
 */
export async function requirePaidUser(): Promise<GuardResult | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const now = Date.now();
  const expired = sub?.expires_at && new Date(sub.expires_at).getTime() < now;
  const effectivePlan = !sub || expired ? 'free' : sub.plan;

  if (effectivePlan === 'free' && profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Recurso exclusivo para assinantes.' },
      { status: 403 }
    );
  }

  return {
    userId: user.id,
    email: profile.email,
    role: profile.role,
    plan: effectivePlan,
  };
}
