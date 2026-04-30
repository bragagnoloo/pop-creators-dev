import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, sendBatchEmails, getUserEmailData, getCampaignApprovedEmails } from '@/lib/email';
import WelcomeEmail from '@/emails/welcome';
import ApplicationReceivedEmail from '@/emails/application-received';
import ApplicationApprovedEmail from '@/emails/application-approved';
import CreditProcessingEmail from '@/emails/credit-processing';
import CreditReleasedEmail from '@/emails/credit-released';
import WithdrawalPaidEmail from '@/emails/withdrawal-paid';
import DeliveryScheduledEmail from '@/emails/delivery-scheduled';
import CampaignNoticeEmail from '@/emails/campaign-notice';
import PlanSubscribedEmail from '@/emails/plan-subscribed';
import type { PixKeyType } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { event, data } = await req.json() as { event: string; data: Record<string, unknown> };

    switch (event) {
      case 'welcome': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          'Seu cadastro na POPline Creators está pronto',
          React.createElement(WelcomeEmail, { fullName: user.fullName }),
          true,
        );
        break;
      }

      case 'application-received': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Candidatura recebida — ${data.campaignTitle}`,
          React.createElement(ApplicationReceivedEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
          }),
        );
        break;
      }

      case 'application-approved': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Candidatura aprovada — ${data.campaignTitle}`,
          React.createElement(ApplicationApprovedEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
          }),
        );
        break;
      }

      case 'credit-processing': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Cache em processamento — ${data.campaignTitle}`,
          React.createElement(CreditProcessingEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            amount: data.amount as number,
          }),
        );
        break;
      }

      case 'credit-released': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          'Seu saldo está disponível para saque!',
          React.createElement(CreditReleasedEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            amount: data.amount as number,
          }),
        );
        break;
      }

      case 'withdrawal-paid': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Saque pago — ${formatBRL(data.amount as number)}`,
          React.createElement(WithdrawalPaidEmail, {
            fullName: user.fullName,
            amount: data.amount as number,
            pixKeyType: data.pixKeyType as PixKeyType,
          }),
        );
        break;
      }

      case 'delivery-scheduled': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Entrega agendada — ${data.campaignTitle}`,
          React.createElement(DeliveryScheduledEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            deliveryDate: data.deliveryDate as string,
            deliveryIndex: data.deliveryIndex as number,
          }),
        );
        break;
      }

      case 'campaign-notice': {
        let recipients: { email: string; fullName: string }[];
        if (data.isGeneral) {
          recipients = await getCampaignApprovedEmails(data.campaignId as string);
        } else {
          const userIds = (data.recipientIds as string[]) ?? [];
          if (userIds.length === 0) break;
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          recipients = (profiles ?? []).map(
            (p: { id: string; email: string; full_name: string }) => ({
              email: p.email,
              fullName: p.full_name,
            }),
          );
        }
        if (recipients.length === 0) break;
        await sendBatchEmails(
          recipients.map(r => ({
            to: r.email,
            subject: `Novo aviso — ${data.campaignTitle}`,
            template: React.createElement(CampaignNoticeEmail, {
              fullName: r.fullName,
              campaignTitle: data.campaignTitle as string,
              noticeContent: data.noticeContent as string,
            }),
          })),
        );
        break;
      }

      case 'plan-subscribed': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Plano ${data.planName} ativado na POPline Creators`,
          React.createElement(PlanSubscribedEmail, {
            fullName: user.fullName,
            planName: data.planName as string,
            expiresAt: data.expiresAt as string,
          }),
        );
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/email/notify]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
