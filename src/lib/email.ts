import { Resend } from 'resend';
import { render } from '@react-email/components';
import { createClient } from '@supabase/supabase-js';
import type { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br';
const FROM_NAMED = `Rodrigo da POPline <${FROM}>`;

export async function sendEmail(
  to: string,
  subject: string,
  template: ReactElement,
  useNamedFrom = false,
): Promise<void> {
  try {
    const html = await render(template);
    await resend.emails.send({
      from: useNamedFrom ? FROM_NAMED : `POPline Creators <${FROM}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[email] falha ao enviar para', to, err);
  }
}

export async function sendBatchEmails(
  recipients: { to: string; subject: string; template: ReactElement }[],
): Promise<void> {
  if (recipients.length === 0) return;
  try {
    const batch = await Promise.all(
      recipients.map(async (r) => ({
        from: `POPline Creators <${FROM}>`,
        to: r.to,
        subject: r.subject,
        html: await render(r.template),
      })),
    );
    // Resend batch: máx 100 por chamada
    for (let i = 0; i < batch.length; i += 100) {
      await resend.batch.send(batch.slice(i, i + 100));
    }
  } catch (err) {
    console.error('[email] falha no envio em lote', err);
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getUserEmailData(
  userId: string,
): Promise<{ email: string; fullName: string } | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();
  if (!data) return null;
  return { email: data.email, fullName: data.full_name };
}

export async function getCampaignApprovedEmails(
  campaignId: string,
): Promise<{ userId: string; email: string; fullName: string }[]> {
  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('user_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'approved');
  if (!apps || apps.length === 0) return [];

  const userIds = apps.map((a: { user_id: string }) => a.user_id);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  return (profiles ?? []).map((p: { id: string; email: string; full_name: string }) => ({
    userId: p.id,
    email: p.email,
    fullName: p.full_name,
  }));
}
