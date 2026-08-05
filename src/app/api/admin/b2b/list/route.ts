import { NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A aba não tem paginação, mas o PostgREST corta em 1000 linhas por padrão. */
const MAX_ROWS = 5000;

export async function GET() {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const supabase = createAdminClient();

  const [overview, platform] = await Promise.all([
    supabase
      .from('b2b_finance_overview')
      .select('*')
      .order('opened_on', { ascending: false })
      .range(0, MAX_ROWS - 1),
    supabase.from('b2b_finance_platform').select('*').maybeSingle(),
  ]);

  if (overview.error) {
    console.error('[admin/b2b/list] db error', overview.error.message);
    return NextResponse.json(
      { error: 'Erro ao carregar os dados financeiros.' },
      { status: 500 }
    );
  }
  if (platform.error) {
    console.error('[admin/b2b/list] platform error', platform.error.message);
  }

  return NextResponse.json({
    data: overview.data ?? [],
    meta: platform.data ?? null,
  });
}
