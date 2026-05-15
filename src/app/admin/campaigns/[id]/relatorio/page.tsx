'use client';

import { use, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import { useAuth } from '@/providers/AuthProvider';
import * as campaignService from '@/services/campaigns';
import * as deliveryService from '@/services/deliveries';
import * as userService from '@/services/users';
import * as analyticsService from '@/services/analytics';
import * as walletService from '@/services/wallet';
import * as stagesService from '@/services/campaign-stages';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type {
  Campaign,
  CampaignApplication,
  CampaignDelivery,
  StageReadiness,
  UserProfile,
} from '@/types';

interface Row {
  application: CampaignApplication;
  profile: UserProfile | null;
  deliveries: CampaignDelivery[];
}

export default function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [readiness, setReadiness] = useState<StageReadiness | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const c = await campaignService.getCampaignById(id);
    setCampaign(c);
    setLoaded(true);
    if (!c) return;
    const apps = await campaignService.getCampaignApplications(id);
    const enriched = await Promise.all(
      apps.map(async app => ({
        application: app,
        profile: await userService.getProfile(app.userId),
        deliveries: await deliveryService.getDeliveriesForUser(id, app.userId),
      }))
    );
    setRows(enriched);
    const rdy = await stagesService.getStageReadiness(id);
    if (rdy.success) setReadiness(rdy.data);
  }, [id]);

  useLoadOnMount(() => {
    if (!user) return;
    load();
  }, [user?.id, load]);

  if (!campaign) {
    return (
      <div className="p-6">
        <Link href={`/admin/campaigns/${id}`} className="text-sm text-text-secondary hover:text-white">
          ← Painel
        </Link>
        <p className="text-text-secondary text-center mt-6">
          {loaded ? 'Campanha não encontrada ou sem acesso.' : 'Carregando relatório...'}
        </p>
      </div>
    );
  }

  const apps = rows.map(r => r.application);
  const approved = apps.filter(a => a.status === 'approved' && !a.disqualifiedAt).length;
  const disqualified = apps.filter(a => a.disqualifiedAt).length;
  const allDeliveries = rows.flatMap(r => r.deliveries);
  const approvedDeliveries = allDeliveries.filter(d => d.deliverableStatus === 'approved').length;
  const revisionDeliveries = allDeliveries.filter(d => d.deliverableStatus === 'needs_revision').length;
  const confirmedPubs = allDeliveries.filter(d => d.publicationStatus === 'confirmed').length;
  const counts = analyticsService.applicationStatusCounts(apps);

  const platformCounts = new Map<string, number>();
  allDeliveries.forEach(d => {
    if (d.publicationPlatform && d.publicationStatus === 'confirmed') {
      platformCounts.set(d.publicationPlatform, (platformCounts.get(d.publicationPlatform) ?? 0) + 1);
    }
  });

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/admin/campaigns/${id}`} className="text-sm text-text-secondary hover:text-white">
          ← Voltar ao painel
        </Link>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </Button>
      </div>

      <header className="flex items-center gap-4 print:gap-3">
        {campaign.imageUrl && (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            width={64}
            height={64}
            className="rounded-xl object-cover border border-border print:border-gray-300"
            sizes="64px"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold print:text-black">{campaign.title}</h1>
          <p className="text-sm text-text-secondary print:text-gray-600">
            Relatório da campanha · gerado em{' '}
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BigNumber label="Candidaturas" value={apps.length} />
        <BigNumber label="Aprovados" value={approved} />
        <BigNumber label="Desclassificados" value={disqualified} />
        <BigNumber label="Vídeos aprovados" value={approvedDeliveries} />
        <BigNumber label="Em correção" value={revisionDeliveries} />
        <BigNumber label="Publicações ✓" value={confirmedPubs} highlight />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4 print:text-black">
            Candidaturas (últimos 14 dias)
          </h2>
          <BarChart
            data={analyticsService.bucketizeByDay(apps, a => a.appliedAt, 14).map(({ label, value }) => ({ label, value }))}
          />
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4 print:text-black">
            Status das candidaturas
          </h2>
          <PieChart
            data={[
              { label: 'Aprovadas', value: counts.approved, color: '#10b981' },
              { label: 'Pendentes', value: counts.pending, color: '#f59e0b' },
              { label: 'Rejeitadas', value: counts.rejected, color: '#6b7280' },
            ]}
          />
        </Card>
      </section>

      {platformCounts.size > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4 print:text-black">
            Publicações confirmadas por plataforma
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {Array.from(platformCounts.entries()).map(([platform, count]) => (
              <li
                key={platform}
                className="flex items-center justify-between p-2 rounded-lg bg-background border border-border print:border-gray-300 print:bg-transparent"
              >
                <span className="text-sm">{platform}</span>
                <strong className="text-lg">{count}</strong>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4 print:text-black">
          Detalhamento por participante
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-text-secondary uppercase tracking-wide">
              <tr>
                <th className="py-2 pr-3">Participante</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Vídeos aprovados</th>
                <th className="py-2 pr-3">Publicações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.application.id} className="border-t border-border print:border-gray-300">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.profile?.fullName ?? 'Sem nome'}</div>
                    <div className="text-xs text-text-secondary print:text-gray-600">{r.profile?.email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {r.application.disqualifiedAt
                      ? 'Desclassificado'
                      : r.application.status === 'approved'
                        ? 'Aprovado'
                        : r.application.status === 'pending'
                          ? 'Pendente'
                          : 'Rejeitado'}
                  </td>
                  <td className="py-2 pr-3">
                    {r.deliveries.filter(d => d.deliverableStatus === 'approved').length} /{' '}
                    {r.deliveries.length}
                  </td>
                  <td className="py-2 pr-3">
                    {r.deliveries.filter(d => d.publicationStatus === 'confirmed').length} /{' '}
                    {r.deliveries.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {readiness && readiness.schedule.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4 print:text-black">
            Linha do tempo
          </h2>
          <ol className="space-y-2">
            {readiness.schedule.map(s => (
              <li key={s.stage} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <strong>Etapa {String(s.stage).padStart(2, '0')}</strong> — {stagesService.STAGE_LABELS[s.stage]}
                </span>
                <span className="text-text-secondary print:text-gray-600">
                  {s.completedAt
                    ? `Concluída em ${new Date(s.completedAt).toLocaleDateString('pt-BR')}`
                    : s.dueDate
                      ? `Prazo: ${new Date(s.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                      : '—'}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {campaign.hasCache && campaign.cache > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2 print:text-black">
            Investimento estimado
          </h2>
          <p className="text-2xl font-bold">
            {walletService.formatBRL(campaign.cache * approved)}
          </p>
          <p className="text-xs text-text-secondary print:text-gray-600">
            {approved} participantes × {walletService.formatBRL(campaign.cache)} por criador
          </p>
        </Card>
      )}
    </div>
  );
}

function BigNumber({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl border ${
        highlight
          ? 'border-emerald-500/40 bg-emerald-500/5 print:bg-transparent print:border-emerald-700'
          : 'border-border bg-background print:bg-transparent print:border-gray-300'
      }`}
    >
      <p className="text-[10px] text-text-secondary uppercase tracking-wide font-medium print:text-gray-600">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 print:text-black">{value}</p>
    </div>
  );
}
