import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { getAllCampaignAdmins, createCampaignAdmin } from '@/services/admin-permissions';

export async function GET() {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const admins = await getAllCampaignAdmins();
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const { email, password, campaignIds } = body as {
    email: string;
    password: string;
    campaignIds: string[];
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
  }
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma campanha.' }, { status: 400 });
  }

  const result = await createCampaignAdmin(email, password, campaignIds, guard.userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ adminId: result.adminId }, { status: 201 });
}
