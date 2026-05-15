'use client';

import { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import { createClient } from '@/lib/supabase/client';
import { Campaign, CampaignApplication, UserProfile, BalanceCredit, CampaignDelivery, StageReadiness, CampaignStage, DeliveryRevision } from '@/types';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import * as walletService from '@/services/wallet';
import * as deliveryService from '@/services/deliveries';
import * as analyticsService from '@/services/analytics';
import * as subService from '@/services/subscriptions';
import * as stagesService from '@/services/campaign-stages';
import * as revisionsService from '@/services/delivery-revisions';
import type { PlanId } from '@/types';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import CampaignNoticesSection from '@/components/admin/CampaignNoticesSection';
import CampaignSchedule from '@/components/admin/campaign-stages/CampaignSchedule';
import CampaignTimeline from '@/components/admin/campaign-stages/CampaignTimeline';
import Stage00Opening from '@/components/admin/campaign-stages/Stage00Opening';
import Stage01Selection from '@/components/admin/campaign-stages/Stage01Selection';
import Stage02Briefing from '@/components/admin/campaign-stages/Stage02Briefing';
import Stage03DeliveryDates from '@/components/admin/campaign-stages/Stage03DeliveryDates';
import Stage04ReviewDeliverables from '@/components/admin/campaign-stages/Stage04ReviewDeliverables';
import Stage05PublicationSchedule from '@/components/admin/campaign-stages/Stage05PublicationSchedule';
import Stage06ReviewPublications from '@/components/admin/campaign-stages/Stage06ReviewPublications';
import Stage07ExportCSV from '@/components/admin/campaign-stages/Stage07ExportCSV';
import Stage08Report from '@/components/admin/campaign-stages/Stage08Report';
import CampaignAuditLog from '@/components/admin/campaign-stages/CampaignAuditLog';
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
  const { user } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [readiness, setReadiness] = useState<StageReadiness | null>(null);
  const [revisionsByDelivery, setRevisionsByDelivery] = useState<Map<string, DeliveryRevision[]>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (user?.role === 'campaign_admin') {
      const supabase = createClient();
      const { data } = await supabase
        .from('admin_campaign_assignments')
        .select('campaign_id')
        .eq('admin_id', user.id)
        .eq('campaign_id', id)
        .maybeSingle();
      if (!data) {
        router.replace('/admin/campaigns');
        return;
      }
    }

    const c = await campaignService.getCampaignById(id);
    if (c) {
      c.cache = c.cache ?? 0;
      c.deliveryCount = c.deliveryCount ?? 1;
    }
    setCampaign(c);
    setLoaded(true);
    if (!c) return;
    const apps = await campaignService.getCampaignApplications(id);
    const rows = await Promise.all(
      apps.map(async app => {
        const deliveries =
          app.status === 'approved'
            ? await deliveryService.ensureDeliveries(id, app.userId, c.deliveryCount)
            : await deliveryService.getDeliveriesForUser(id, app.userId);
        return {
          application: app,
          profile: await userService.getProfile(app.userId),
          credit: await walletService.getCreditForUserCampaign(app.userId, id),
          deliveries,
          plan: await subService.getUserPlan(app.userId),
        };
      })
    );
    setRows(rows);

    const rdy = await stagesService.getStageReadiness(id);
    if (rdy.success) setReadiness(rdy.data);

    // Busca todas as revisões da campanha e agrupa por delivery_id
    const allRevisions = await revisionsService.getRevisionsForCampaign(id);
    const map = new Map<string, DeliveryRevision[]>();
    for (const rev of allRevisions) {
      const list = map.get(rev.deliveryId) ?? [];
      list.push(rev);
      map.set(rev.deliveryId, list);
    }
    setRevisionsByDelivery(map);
  }, [id, user, router]);

  useLoadOnMount(() => {
    if (!user) return;
    void load();
  }, [user?.id, load]);

  if (!campaign) {
    return (
      <div>
        <Link href={ROUTES.ADMIN_CAMPAIGNS} className="text-sm text-text-secondary hover:text-white">
          ← Campanhas
        </Link>
        <Card className="mt-4">
          <p className="text-center text-text-secondary">
            {loaded ? 'Campanha não encontrada.' : 'Carregando campanha...'}
          </p>
        </Card>
      </div>
    );
  }

  const handleCreate = async (userId: string) => {
    await walletService.createCredit(userId, campaign.id, campaign.cache);
    fetch('/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'credit-processing',
        data: { userId, campaignTitle: campaign.title, amount: campaign.cache },
      }),
    }).catch(() => {});
    load();
  };

  const handleRelease = async (creditId: string) => {
    const matchRow = rows.find(r => r.credit?.id === creditId);
    await walletService.releaseCredit(creditId);
    if (matchRow) {
      fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'credit-released',
          data: {
            userId: matchRow.application.userId,
            campaignTitle: campaign.title,
            amount: matchRow.credit!.amount,
          },
        }),
      }).catch(() => {});
    }
    load();
  };

  const handleDeliveryDate = async (deliveryId: string, date: string) => {
    // date é "YYYY-MM-DD" (local). Parsea como meia-noite local para evitar
    // off-by-one quando a TZ é negativa.
    const localDate = date ? new Date(date + 'T00:00:00') : null;
    await deliveryService.updateDelivery(deliveryId, {
      scheduledDate: localDate ? localDate.toISOString() : null,
    });
    if (localDate) {
      const matchRow = rows.find(r => r.deliveries.some(d => d.id === deliveryId));
      if (matchRow) {
        const delivery = matchRow.deliveries.find(d => d.id === deliveryId);
        fetch('/api/email/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'delivery-scheduled',
            data: {
              userId: matchRow.application.userId,
              campaignTitle: campaign.title,
              deliveryDate: localDate.toLocaleDateString('pt-BR'),
              deliveryIndex: delivery?.index ?? 1,
            },
          }),
        }).catch(() => {});
      }
    }
    load();
  };

  const handleCompleteStage = async (note: string | null) => {
    const stage = (campaign?.currentStage ?? 0) as CampaignStage;
    const result = await stagesService.completeStage(campaign!.id, stage, note ?? undefined);
    if (result.success) await load();
    return result.success
      ? { success: true as const }
      : { success: false as const, error: result.error };
  };

  const handleDecide = async (applicationId: string, status: 'approved' | 'rejected') => {
    const updated = await campaignService.updateApplicationStatus(applicationId, status);
    if (!updated) {
      alert('Não foi possível atualizar a candidatura. Verifique sua permissão e tente novamente.');
      return;
    }
    if (status === 'approved') {
      const matchRow = rows.find(r => r.application.id === applicationId);
      if (matchRow) {
        fetch('/api/email/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'application-approved',
            data: { userId: matchRow.application.userId, campaignTitle: campaign!.title },
          }),
        }).catch(() => {});
      }
    }
    await load();
  };

  const handleSaveDeadline = async (
    stage: CampaignStage,
    newDate: string,
    reason: string | null
  ) => {
    const result = await stagesService.setStageDeadline(
      campaign!.id,
      stage,
      newDate,
      reason ?? undefined
    );
    if (result.success) await load();
    return result.success
      ? { success: true as const }
      : { success: false as const, error: result.error };
  };

  const byPlanDesc = (a: Row, b: Row) => subService.getPlanRank(b.plan) - subService.getPlanRank(a.plan);
  const approved = rows.filter(r => r.application.status === 'approved').sort(byPlanDesc);
  // Pendentes ficam só dentro do Stage01Selection; aqui mostramos apenas rejeitados (histórico).
  const others = rows.filter(r => r.application.status === 'rejected').sort(byPlanDesc);
  const canManage = true; // página já é protegida pelo redirect inicial
  const currentStage = (campaign.currentStage ?? 0) as CampaignStage;

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.ADMIN_CAMPAIGNS} className="text-sm text-text-secondary hover:text-white">
          ← Campanhas
        </Link>
        <h1 className="text-2xl font-bold mt-2">{campaign.title}</h1>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {campaign.hasCache && campaign.cache > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Cachê {walletService.formatBRL(campaign.cache)}
            </span>
          )}
          {campaign.hasPermuta && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-400 border-sky-500/30">
              Permuta
            </span>
          )}
          {campaign.hasCommission && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
              {campaign.commissionPercentage != null ? `${campaign.commissionPercentage}% comissão` : 'Comissão'}
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary mt-1">
          {campaign.deliveryCount ?? 1} entrega{(campaign.deliveryCount ?? 1) > 1 ? 's' : ''} por criador
        </p>
      </div>

      {/* 1. Métricas no topo */}
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

      {/* 2. Cronograma da campanha */}
      <CampaignSchedule
        campaignId={campaign.id}
        schedule={readiness?.schedule ?? []}
        currentStage={currentStage}
        canEdit={canManage}
        onSaveDeadline={handleSaveDeadline}
        onBulkSaved={load}
      />

      {/* 3. Progresso da campanha */}
      <CampaignTimeline
        currentStage={currentStage}
        readiness={readiness}
        canComplete={canManage}
        onComplete={handleCompleteStage}
      />

      {/* 4. Avisos da campanha (colapsável) */}
      <CollapsibleSection
        title="Avisos da campanha"
        description="Mensagens enviadas aos participantes aprovados"
      >
        <CampaignNoticesSection
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          approved={approved
            .filter(r => !r.application.disqualifiedAt)
            .map(r => ({ application: r.application, profile: r.profile }))}
        />
      </CollapsibleSection>

      {/* 5. Etapas (cada uma colapsável, fechadas por padrão) */}
      <CollapsibleSection
        title="Etapa 00 — Abertura"
        description="Dados gerais da campanha (criação)"
      >
        <Stage00Opening campaign={campaign} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 01 — Seleção"
        description="Aprovar candidatos, link do grupo e presença no WhatsApp"
      >
        <Stage01Selection
          campaignId={campaign.id}
          whatsappLink={campaign.whatsappGroupLink ?? null}
          approved={approved.map(r => ({ application: r.application, profile: r.profile }))}
          pending={rows
            .filter(r => r.application.status === 'pending')
            .map(r => ({ application: r.application, profile: r.profile }))}
          onChanged={load}
          onDecide={handleDecide}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 02 — Briefing"
        description="Texto e/ou arquivo, notificação aos aprovados"
      >
        <Stage02Briefing
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          initialBriefing={campaign.briefing}
          initialBriefingFileUrl={campaign.briefingFileUrl ?? null}
          onSaved={load}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 03 — Datas de entrega"
        description="Atribuir prazo de entrega do vídeo a cada criador"
      >
        <Stage03DeliveryDates
          rows={approved.map(r => ({
            application: r.application,
            profile: r.profile,
            deliveries: r.deliveries,
          }))}
          onSetDate={handleDeliveryDate}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 04 — Análise de entregáveis"
        description="Aprovar vídeos ou pedir correção"
      >
        <Stage04ReviewDeliverables
          rows={approved.map(r => ({
            application: r.application,
            profile: r.profile,
            deliveries: r.deliveries,
          }))}
          campaignTitle={campaign.title}
          revisionsByDelivery={revisionsByDelivery}
          onChanged={load}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 05 — Agenda de publicação"
        description="Data e plataforma de cada publicação aprovada"
      >
        <Stage05PublicationSchedule
          rows={approved.map(r => ({
            application: r.application,
            profile: r.profile,
            deliveries: r.deliveries,
          }))}
          campaignTitle={campaign.title}
          onChanged={load}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 06 — Análise de publicações"
        description="Confirmar publicação, pedir reenvio ou desclassificar"
      >
        <Stage06ReviewPublications
          rows={approved.map(r => ({
            application: r.application,
            profile: r.profile,
            deliveries: r.deliveries,
          }))}
          campaignTitle={campaign.title}
          onChanged={load}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 07 — CSV para a marca"
        description="Exportar planilha de participantes e publicações confirmadas"
      >
        <Stage07ExportCSV
          campaignId={campaign.id}
          rows={approved.map(r => ({
            application: r.application,
            profile: r.profile,
            deliveries: r.deliveries,
          }))}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Etapa 08 — Relatório final"
        description="Abrir relatório imprimível com bignumbers e gráficos"
      >
        <Stage08Report campaignId={campaign.id} />
      </CollapsibleSection>

      {/* Participantes aprovados (saldo) */}
      <CollapsibleSection
        title="Participantes aprovados — saldos"
        description="Gerar e liberar cachê dos criadores aprovados"
      >
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
                hasCache={campaign.hasCache && campaign.cache > 0}
                onCreate={() => handleCreate(row.application.userId)}
                onRelease={row.credit ? () => handleRelease(row.credit!.id) : undefined}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Histórico e auditoria */}
      <CampaignAuditLog
        campaign={campaign}
        schedule={readiness?.schedule ?? []}
        isMasterAdmin={user?.role === 'admin'}
        onReverted={load}
      />

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
                {row.application.status === 'pending' ? (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => handleDecide(row.application.id, 'rejected')}>
                      Rejeitar
                    </Button>
                    <Button size="sm" onClick={() => handleDecide(row.application.id, 'approved')}>
                      Aprovar
                    </Button>
                  </div>
                ) : (
                  <Badge variant="default">Rejeitado</Badge>
                )}
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
  hasCache,
  onCreate,
  onRelease,
}: {
  row: Row;
  campaignCache: number;
  hasCache: boolean;
  onCreate: () => void;
  onRelease?: () => void;
}) {
  const { profile, credit } = row;

  return (
    <div className="p-4 rounded-xl bg-background border border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={profile?.photoUrl} name={profile?.fullName || ''} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{profile?.fullName || 'Sem nome'}</p>
              <PlanMiniBadge plan={row.plan} />
              {row.application.disqualifiedAt && <Badge variant="default">Desclassificado</Badge>}
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
        <div className="flex gap-2 shrink-0 items-center">
          {hasCache ? (
            <>
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
            </>
          ) : (
            <span className="text-xs text-text-secondary italic">Campanha sem cachê</span>
          )}
        </div>
      </div>

      {/* Entregas movidas para Stage03DeliveryDates / Stage04ReviewDeliverables / Stage05PublicationSchedule */}
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

