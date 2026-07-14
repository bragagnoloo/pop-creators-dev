import { NextResponse } from 'next/server';
import React from 'react';
import { render } from '@react-email/components';
import { requireMasterAdmin } from '@/lib/auth-guard';
import CampaignConfidentialInviteEmail from '@/emails/campaign-confidential-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  const html = await render(React.createElement(CampaignConfidentialInviteEmail));
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
