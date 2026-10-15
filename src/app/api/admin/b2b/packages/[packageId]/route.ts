import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { UUID_RE, ValidationError } from '@/lib/b2b-validation';
import { PACKAGE_COLUMNS, parsePackageBody } from '../parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ packageId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { packageId } = await params;
  if (!UUID_RE.test(packageId)) {
    return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  let patch: Record<string, unknown>;
  try {
    patch = parsePackageBody(body);
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : 'Dados inválidos.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('b2b_packages')
    .update({ ...patch, updated_by: guard.userId })
    .eq('id', packageId)
    .select(PACKAGE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('[admin/b2b/packages PATCH] update error', error.message);
    return NextResponse.json({ error: 'Erro ao salvar o pacote.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Pacote não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ data });
}

/**
 * Apaga só o pacote. A FK campaign_finance.package_id é `on delete set null`:
 * as campanhas viram avulsas e mantêm todos os valores financeiros.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { packageId } = await params;
  if (!UUID_RE.test(packageId)) {
    return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('b2b_packages')
    .delete()
    .eq('id', packageId)
    .select(PACKAGE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('[admin/b2b/packages DELETE] delete error', error.message);
    return NextResponse.json({ error: 'Erro ao apagar o pacote.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Pacote não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ data });
}
