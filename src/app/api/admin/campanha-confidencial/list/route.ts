import { NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('campanha_confidencial_inscricoes')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[admin/campanha-confidencial/list] db error', error.message);
    return NextResponse.json({ error: 'Erro ao carregar inscrições' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
