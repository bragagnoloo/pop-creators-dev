import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { updateAdminAssignments, updateAdminExtraTabs, revokeCampaignAdmin } from '@/services/admin-permissions';
import type { AdminTab } from '@/types';

const VALID_TABS: AdminTab[] = ['assinaturas', 'users', 'ranking'];

function sanitizeExtraTabs(input: unknown): AdminTab[] {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is AdminTab => VALID_TABS.includes(t as AdminTab));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const body = await req.json();
  const { campaignIds, extraTabs } = body as { campaignIds: string[]; extraTabs?: string[] };

  if (!Array.isArray(campaignIds)) {
    return NextResponse.json({ error: 'campaignIds deve ser um array.' }, { status: 400 });
  }

  await updateAdminAssignments(id, campaignIds, guard.userId);
  await updateAdminExtraTabs(id, sanitizeExtraTabs(extraTabs));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  await revokeCampaignAdmin(id);
  return NextResponse.json({ success: true });
}
