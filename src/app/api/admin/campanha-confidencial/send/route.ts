import { NextResponse } from 'next/server';
import React from 'react';
import { requireMasterAdmin } from '@/lib/auth-guard';
import { sendBatchEmails } from '@/lib/email';
import CampaignConfidentialInviteEmail from '@/emails/campaign-confidential-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBJECT = 'Oportunidade exclusiva · POPline Creators (Confidencial)';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
  const guard = await requireMasterAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: { emails?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!Array.isArray(body.emails)) {
    return NextResponse.json({ error: 'Campo "emails" deve ser uma lista' }, { status: 400 });
  }

  // Normaliza, valida e deduplica
  const seen = new Set<string>();
  const invalid: string[] = [];
  const emails: string[] = [];
  for (const raw of body.emails) {
    const email = String(raw).trim().toLowerCase();
    if (!email) continue;
    if (!isValidEmail(email)) {
      invalid.push(email);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  if (emails.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum e-mail válido na lista.', invalid },
      { status: 400 },
    );
  }

  await sendBatchEmails(
    emails.map((to) => ({
      to,
      subject: SUBJECT,
      template: React.createElement(CampaignConfidentialInviteEmail),
    })),
  );

  return NextResponse.json({ enviados: emails.length, invalidos: invalid });
}
