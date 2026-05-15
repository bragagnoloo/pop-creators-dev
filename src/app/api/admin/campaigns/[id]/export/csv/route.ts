import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCampaignAccess } from '@/lib/auth-guard';

type DeliveryRow = {
  id: string;
  user_id: string;
  index: number;
  content_url: string | null;
  publication_url: string | null;
  publication_status: string;
  publication_platform: string | null;
  publication_date: string | null;
  publication_confirmed_at: string | null;
};

type ApplicationRow = {
  id: string;
  user_id: string;
  disqualified_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
};

type CampaignRow = { id: string; title: string };

function escapeCSV(value: string | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function safeFilename(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'campanha';
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireCampaignAccess(id);
  if (guard instanceof NextResponse) return guard;

  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title')
    .eq('id', id)
    .single<CampaignRow>();
  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }

  const { data: apps } = await supabase
    .from('applications')
    .select('id, user_id, disqualified_at')
    .eq('campaign_id', id)
    .eq('status', 'approved')
    .is('disqualified_at', null)
    .returns<ApplicationRow[]>();
  const approvedUserIds = (apps ?? []).map(a => a.user_id);

  const [{ data: deliveries }, { data: profiles }] =
    approvedUserIds.length === 0
      ? [{ data: [] as DeliveryRow[] }, { data: [] as ProfileRow[] }]
      : await Promise.all([
          supabase
            .from('campaign_deliveries')
            .select(
              'id, user_id, index, content_url, publication_url, publication_status, publication_platform, publication_date, publication_confirmed_at'
            )
            .eq('campaign_id', id)
            .in('user_id', approvedUserIds)
            .eq('publication_status', 'confirmed')
            .order('index', { ascending: true })
            .returns<DeliveryRow[]>(),
          supabase
            .from('profiles')
            .select('id, full_name, email, whatsapp')
            .in('id', approvedUserIds)
            .returns<ProfileRow[]>(),
        ]);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  const headers = [
    'Nome',
    'Email',
    'WhatsApp',
    'Entrega',
    'URL Video',
    'URL Publicacao',
    'Plataforma',
    'Data Publicacao',
    'Confirmada em',
  ];

  const lines: string[] = [headers.map(escapeCSV).join(',')];
  for (const d of deliveries ?? []) {
    const p = profileMap.get(d.user_id);
    lines.push(
      [
        p?.full_name ?? '',
        p?.email ?? '',
        p?.whatsapp ?? '',
        String(d.index),
        d.content_url ?? '',
        d.publication_url ?? '',
        d.publication_platform ?? '',
        d.publication_date ? new Date(d.publication_date).toLocaleString('pt-BR') : '',
        d.publication_confirmed_at
          ? new Date(d.publication_confirmed_at).toLocaleString('pt-BR')
          : '',
      ]
        .map(escapeCSV)
        .join(',')
    );
  }

  const BOM = '﻿';
  const body = BOM + lines.join('\r\n') + '\r\n';
  const filename = `${safeFilename(campaign.title)}-publicacoes.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
