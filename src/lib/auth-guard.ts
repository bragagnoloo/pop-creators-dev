import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

export interface GuardResult {
  userId: string;
  email: string;
  role: UserRole;
  plan: string;
}

/**
 * Valida apenas sessão — qualquer usuário autenticado passa.
 */
export async function requireUser(): Promise<GuardResult | NextResponse> {
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

  return {
    userId: user.id,
    email: profile.email,
    role: profile.role,
    plan: effectivePlan,
  };
}

/**
 * Exige role admin (master admin apenas). Mantido para compatibilidade retroativa.
 */
export async function requireAdmin(): Promise<GuardResult | NextResponse> {
  return requireMasterAdmin();
}

/**
 * Exige master admin (role = 'admin').
 */
export async function requireMasterAdmin(): Promise<GuardResult | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  if (result.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito ao administrador master.' }, { status: 403 });
  }
  return result;
}

/**
 * Exige qualquer admin (master ou campaign_admin).
 */
export async function requireAnyAdmin(): Promise<GuardResult | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  if (result.role !== 'admin' && result.role !== 'campaign_admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }
  return result;
}

/**
 * Exige acesso à campanha: master admin ou campaign_admin com atribuição.
 * Consulta a função can_manage_campaign do Supabase.
 */
export async function requireCampaignAccess(campaignId: string): Promise<GuardResult | NextResponse> {
  const result = await requireAnyAdmin();
  if (result instanceof NextResponse) return result;
  if (result.role === 'admin') return result;

  const supabase = await createClient();
  const { data } = await supabase.rpc('can_manage_campaign', { p_campaign_id: campaignId });
  if (!data) {
    return NextResponse.json({ error: 'Sem acesso a esta campanha.' }, { status: 403 });
  }
  return result;
}

/**
 * Valida sessão + exige plano pago (ou qualquer admin).
 */
export async function requirePaidUser(): Promise<GuardResult | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  if (result.plan === 'free' && result.role === 'creator') {
    return NextResponse.json(
      { error: 'Recurso exclusivo para assinantes.' },
      { status: 403 }
    );
  }
  return result;
}
