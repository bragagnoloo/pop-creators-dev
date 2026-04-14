'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import * as authService from '@/services/auth';
import * as userService from '@/services/users';
import * as campaignService from '@/services/campaigns';
import * as walletService from '@/services/wallet';
import * as analyticsService from '@/services/analytics';

export default function AdminDashboard() {
  const [data, setData] = useState({
    totalUsers: 0,
    activeCampaigns: 0,
    totalApplications: 0,
    approvedApplications: 0,
    totalDistributed: 0,
    pendingWithdrawals: 0,
    usersByDay: [] as { label: string; value: number }[],
    applicationsByDay: [] as { label: string; value: number }[],
    approvalCounts: { approved: 0, pending: 0, rejected: 0 },
  });

  useEffect(() => {
    (async () => {
    const allUsers = await authService.getAllUsers();
    const users = analyticsService.nonAdminUsers(allUsers);
    const profiles = await userService.getAllProfiles();
    const campaigns = await campaignService.getAllCampaigns();
    const applications = await campaignService.getAllApplications();
    const withdrawals = await walletService.getAllWithdrawals();
    const credits = await walletService.getAllCredits();

    const totalDistributed = credits
      .filter(c => c.status === 'available' || c.status === 'withdrawn')
      .reduce((acc, c) => acc + c.amount, 0);

    const pendingWithdrawals = withdrawals.filter(w => w.status === 'requested').length;

    setData({
      totalUsers: Math.max(users.length, profiles.length),
      activeCampaigns: campaigns.filter(c => c.status === 'open').length,
      totalApplications: applications.length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      totalDistributed,
      pendingWithdrawals,
      usersByDay: analyticsService
        .bucketizeByDay(users, u => u.createdAt, 14)
        .map(({ label, value }) => ({ label, value })),
      applicationsByDay: analyticsService
        .bucketizeByDay(applications, a => a.appliedAt, 14)
        .map(({ label, value }) => ({ label, value })),
      approvalCounts: analyticsService.applicationStatusCounts(applications),
    });
    })();
  }, []);

  const summaryCards = [
    { label: 'Total de usuários', value: data.totalUsers, color: 'text-popline-pink' },
    { label: 'Campanhas abertas', value: data.activeCampaigns, color: 'text-emerald-400' },
    { label: 'Candidaturas', value: data.totalApplications, color: 'text-amber-400' },
    { label: 'Saques pendentes', value: data.pendingWithdrawals, color: 'text-popline-light' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label}>
            <p className="text-sm text-text-secondary">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </Card>
        ))}
        <Card className="sm:col-span-2 lg:col-span-2">
          <p className="text-sm text-text-secondary">Saldo distribuído (disponível + sacado)</p>
          <p className="text-3xl font-bold mt-2 text-emerald-400">
            {walletService.formatBRL(data.totalDistributed)}
          </p>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-2">
          <p className="text-sm text-text-secondary">Taxa de aprovação</p>
          <p className="text-3xl font-bold mt-2">
            {data.totalApplications > 0
              ? `${Math.round((data.approvedApplications / data.totalApplications) * 100)}%`
              : '—'}
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Novos usuários por dia (últimos 14)
          </h2>
          <BarChart data={data.usersByDay} color="#ec4899" />
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Candidaturas por dia (últimos 14)
          </h2>
          <BarChart data={data.applicationsByDay} color="#a855f7" />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Status das candidaturas (global)
          </h2>
          <PieChart
            data={[
              { label: 'Aprovadas', value: data.approvalCounts.approved, color: '#10b981' },
              { label: 'Aguardando análise', value: data.approvalCounts.pending, color: '#f59e0b' },
              { label: 'Reprovadas', value: data.approvalCounts.rejected, color: '#6b7280' },
            ]}
          />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Assinantes vs Gratuitos
          </h2>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-32 h-32 rounded-full border-8 border-border border-dashed" />
            <p className="text-xs text-text-secondary mt-3 text-center max-w-xs">
              Disponível após a implementação da feature de Planos. Vamos plugar aqui assim que tivermos o modelo de assinaturas.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Acessos por dia
          </h2>
          <div className="py-6 text-center">
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Métrica de acessos precisa de tracking de sessão (ex: registrar login ou page view). Não conseguimos reconstruir do storage atual — implemento junto com o Supabase ou um analytics dedicado.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
