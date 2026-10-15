import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/b2b-validation';
import { PACKAGE_COLUMNS, parsePackageBody } from './parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  let row: Record<string, unknown>;
  try {
    row = parsePackageBody(body);
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : 'Dados inválidos.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (!row.name) {
    return NextResponse.json({ error: 'Dê um nome ao pacote.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('b2b_packages')
    .insert({ ...row, updated_by: guard.userId })
    .select(PACKAGE_COLUMNS)
    .single();

  if (error || !data) {
    console.error('[admin/b2b/packages POST] insert error', error?.message);
    return NextResponse.json({ error: 'Erro ao criar o pacote.' }, { status: 500 });
  }
  return NextResponse.json({ data });
}
