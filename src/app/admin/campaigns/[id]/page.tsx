'use client';

import { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { Campaign, CampaignApplication, UserProfile, BalanceCredit, CampaignDelivery } from '@/types';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import * as walletService from '@/services/wallet';
import * as deliveryService from '@/services/deliveries';
import * as analyticsService from '@/services/analytics';
import * as subService from '@/services/subscriptions';
import type { PlanId } from '@/types';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { ROUTES } from '@/lib/constants';

interface Row {
  application: CampaignApplication;
  profile: UserProfile | null;
  credit: BalanceCredit | null;
  deliveries: CampaignDelivery[];
  plan: PlanId;
}

export default function CampaignControlPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(() => {
    const c = campaignService.getCampaignById(id);
    if (c) {
      c.cache = c.cache ?? 0;
      c.deliveryCount = c.deliveryCount ?? 1;
    }
    setCampaign(c);
    if (!c) return;
    const apps = campaignService.getCampaignApplications(id);
    setRows(
      apps.map(app => {
        const deliveries =
          app.status === 'approved'
            ? deliveryService.ensureDeliveries(id, app.userId, c.deliveryCount)
            : deliveryService.getDeliveriesForUser(id, app.userId);
        return {
          application: app,
          profile: userService.getProfile(app.userId),
          credit: walletService.getCreditForUserCampaign(app.userId, id),
          deliveries,
          plan: subService.getUserPlan(app.userId),
        };
      })
    );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!campaign) {
    return (
      <div>
        <Link href={ROUTES.ADMIN_CAMPAIGNS} className="text-sm text-text-secondary hover:text-white">
          ← Campanhas
        </Link>
        <Card className="mt-4">
          <p className="text-center text-text-secondary">Campanha não encontrada.</p>
        </Card>
      </div>
    );
  }

  const handleCreate = (userId: string) => {
    walletService.createCredit(userId, campaign.id, campaign.cache);
    load();
  };

  const handleRelease = (creditId: string) => {
    walletService.releaseCredit(creditId);
    load();
  };

  const handleDeliveryDate = (deliveryId: string, date: string) => {
    deliveryService.updateDelivery(deliveryId, { scheduledDate: date ? new Date(date).toISOString() : null });
    load();
  };

  const byPlanDesc = (a: Row, b: Row) => subService.getPlanRank(b.plan) - subService.getPlanRank(a.plan);
  const approved = rows.filter(r => r.application.status === 'approved').sort(byPlanDesc);
  const others = rows.filter(r => r.application.status !== 'approved').sort(byPlanDesc);

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.ADMIN_CAMPAIGNS} className="text-sm text-text-secondary hover:text-white">
          ← Campanhas
        </Link>
        <h1 className="text-2xl font-bold mt-2">{campaign.title}</h1>
        <p className="text-sm text-text-secondary">
          Cachê: {walletService.formatBRL(campaign.cache)} · {campaign.deliveryCount ?? 1} entrega
          {(campaign.deliveryCount ?? 1) > 1 ? 's' : ''} por criador
        </p>
      </div>

      {/* Metrics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Candidaturas por dia (últimos 14)
          </h2>
          <BarChart
            data={analyticsService
              .bucketizeByDay(rows.map(r => r.application), app => app.appliedAt, 14)
              .map(({ label, value }) => ({ label, value }))}
          />
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Status das candidaturas
          </h2>
          {(() => {
            const counts = analyticsService.applicationStatusCounts(rows.map(r => r.application));
            return (
              <PieChart
                data={[
                  { label: 'Aprovadas', value: counts.approved, color: '#10b981' },
                  { label: 'Aguardando análise', value: counts.pending, color: '#f59e0b' },
                  { label: 'Reprovadas', value: counts.rejected, color: '#6b7280' },
                ]}
              />
            );
          })()}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Participantes aprovados</h2>
        {approved.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">
            Nenhum participante aprovado. Aprove candidaturas para liberar saldos.
          </p>
        ) : (
          <div className="space-y-3">
            {approved.map(row => (
              <ParticipantRow
                key={row.application.id}
                row={row}
                campaignCache={campaign.cache}
                onCreate={() => handleCreate(row.application.userId)}
                onRelease={row.credit ? () => handleRelease(row.credit!.id) : undefined}
                onDeliveryDate={handleDeliveryDate}
              />
            ))}
          </div>
        )}
      </Card>

      {others.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Outras candidaturas</h2>
          <div className="space-y-3">
            {others.map(row => (
              <div
                key={row.application.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={row.profile?.photoUrl} name={row.profile?.fullName || ''} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{row.profile?.fullName || 'Sem nome'}</p>
                      <PlanMiniBadge plan={row.plan} />
                    </div>
                    <p className="text-xs text-text-secondary truncate">{row.profile?.email}</p>
                  </div>
                </div>
                <Badge variant={row.application.status === 'pending' ? 'warning' : 'default'}>
                  {row.application.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ParticipantRow({
  row,
  campaignCache,
  onCreate,
  onRelease,
  onDeliveryDate,
}: {
  row: Row;
  campaignCache: number;
  onCreate: () => void;
  onRelease?: () => void;
  onDeliveryDate: (deliveryId: string, date: string) => void;
}) {
  const { profile, credit, deliveries } = row;

  return (
    <div className="p-4 rounded-xl bg-background border border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={profile?.photoUrl} name={profile?.fullName || ''} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{profile?.fullName || 'Sem nome'}</p>
              <PlanMiniBadge plan={row.plan} />
            </div>
            <p className="text-xs text-text-secondary truncate">{profile?.email}</p>
            {credit && (
              <p className="text-xs text-text-secondary mt-1">
                {walletService.formatBRL(credit.amount)} ·{' '}
                {credit.status === 'processing' && <span className="text-yellow-400">Em processamento</span>}
                {credit.status === 'available' && <span className="text-green-400">Disponível para saque</span>}
                {credit.status === 'withdrawn' && <span className="text-text-secondary">Sacado</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            disabled={!!credit}
            onClick={onCreate}
            variant={credit ? 'secondary' : 'primary'}
          >
            {credit ? 'Saldo gerado' : `Gerar saldo (${walletService.formatBRL(campaignCache)})`}
          </Button>
          {credit && credit.status === 'processing' && onRelease && (
            <Button size="sm" onClick={onRelease}>Liberar saque</Button>
          )}
          {credit && credit.status === 'available' && <Badge variant="success">Liberado</Badge>}
          {credit && credit.status === 'withdrawn' && <Badge variant="default">Sacado</Badge>}
        </div>
      </div>

      {deliveries.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary mb-2">Entregas</p>
          <div className="space-y-2">
            {deliveries.map(d => (
              <DeliveryAdminRow key={d.id} delivery={d} onSave={onDeliveryDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanMiniBadge({ plan }: { plan: PlanId }) {
  if (plan === 'free') return null;
  const styles: Record<Exclude<PlanId, 'free'>, { bg: string; label: string; icon?: string }> = {
    monthly: { bg: 'bg-blue-500/20 text-blue-400', label: 'Mensal · 1x' },
    semester: { bg: 'bg-popline-pink/20 text-popline-light', label: 'Semestral · 2x' },
    yearly: { bg: 'bg-amber-500/20 text-amber-400', label: 'Anual · 5x' },
  };
  const s = styles[plan];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.bg}`}>
      {s.label}
    </span>
  );
}

function DeliveryAdminRow({
  delivery,
  onSave,
}: {
  delivery: CampaignDelivery;
  onSave: (deliveryId: string, date: string) => void;
}) {
  const initial = useMemo(
    () => (delivery.scheduledDate ? delivery.scheduledDate.split('T')[0] : ''),
    [delivery.scheduledDate]
  );
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = draft !== initial;

  const handleSave = () => {
    onSave(delivery.id, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs text-text-secondary w-20 shrink-0">Entrega {delivery.index}</span>
      <input
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink w-full sm:w-auto"
      />
      <Button size="sm" variant="secondary" disabled={!dirty && !saved} onClick={handleSave}>
        {saved ? 'Salvo ✓' : 'Salvar'}
      </Button>
      <div className="flex-1 min-w-0 text-xs">
        {delivery.contentUrl ? (
          <a
            href={delivery.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-popline-pink hover:underline truncate inline-block max-w-full"
          >
            {delivery.contentUrl}
          </a>
        ) : (
          <span className="text-text-secondary italic">aguardando URL do criador</span>
        )}
      </div>
    </div>
  );
}
