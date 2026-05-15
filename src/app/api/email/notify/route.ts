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
import SubscriptionCancelledEmail from '@/emails/subscription-cancelled';
import RefundConfirmedEmail from '@/emails/refund-confirmed';
import BriefingPublishedEmail from '@/emails/briefing-published';
import DeliveryRevisionNeededEmail from '@/emails/delivery-revision-needed';
import DeliveryApprovedEmail from '@/emails/delivery-approved';
import PublicationScheduledEmail from '@/emails/publication-scheduled';
import PublicationResubmitEmail from '@/emails/publication-resubmit';
import PublicationConfirmedEmail from '@/emails/publication-confirmed';
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

      case 'subscription-cancelled': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Renovação do plano ${data.planName} cancelada`,
          React.createElement(SubscriptionCancelledEmail, {
            fullName: user.fullName,
            planName: data.planName as string,
            accessUntil: data.accessUntil as string,
          }),
        );
        break;
      }

      case 'briefing-published': {
        const recipients = await getCampaignApprovedEmails(data.campaignId as string);
        if (recipients.length === 0) break;
        await sendBatchEmails(
          recipients.map(r => ({
            to: r.email,
            subject: `Briefing publicado — ${data.campaignTitle}`,
            template: React.createElement(BriefingPublishedEmail, {
              fullName: r.fullName,
              campaignTitle: data.campaignTitle as string,
              briefingText: (data.briefingText as string | null) ?? null,
              briefingFileUrl: (data.briefingFileUrl as string | null) ?? null,
            }),
          }))
        );
        break;
      }

      case 'delivery-revision-needed': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Correção solicitada — ${data.campaignTitle}`,
          React.createElement(DeliveryRevisionNeededEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            deliveryIndex: data.deliveryIndex as number,
            revisionNote: data.revisionNote as string,
            revisionDueDate: data.revisionDueDate as string,
          })
        );
        break;
      }

      case 'delivery-approved': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Entrega aprovada — ${data.campaignTitle}`,
          React.createElement(DeliveryApprovedEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            deliveryIndex: data.deliveryIndex as number,
          })
        );
        break;
      }

      case 'publication-scheduled': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Publicação agendada — ${data.campaignTitle}`,
          React.createElement(PublicationScheduledEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            deliveryIndex: data.deliveryIndex as number,
            publicationDate: data.publicationDate as string,
            publicationPlatform: data.publicationPlatform as string,
          })
        );
        break;
      }

      case 'publication-resubmit': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Reenviar publicação — ${data.campaignTitle}`,
          React.createElement(PublicationResubmitEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
            publicationDueDate: data.publicationDueDate as string,
          })
        );
        break;
      }

      case 'publication-confirmed': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Publicação confirmada — ${data.campaignTitle}`,
          React.createElement(PublicationConfirmedEmail, {
            fullName: user.fullName,
            campaignTitle: data.campaignTitle as string,
          })
        );
        break;
      }

      case 'refund-confirmed': {
        const user = await getUserEmailData(data.userId as string);
        if (!user) break;
        await sendEmail(
          user.email,
          `Reembolso de ${data.amount} confirmado`,
          React.createElement(RefundConfirmedEmail, {
            fullName: user.fullName,
            planName: data.planName as string,
            amount: data.amount as string,
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
