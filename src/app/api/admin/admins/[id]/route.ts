import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { updateAdminAssignments, revokeCampaignAdmin } from '@/services/admin-permissions';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const body = await req.json();
  const { campaignIds } = body as { campaignIds: string[] };

  if (!Array.isArray(campaignIds)) {
    return NextResponse.json({ error: 'campaignIds deve ser um array.' }, { status: 400 });
  }

  await updateAdminAssignments(id, campaignIds, guard.userId);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  await revokeCampaignAdmin(id);
  return NextResponse.json({ success: true });
}
