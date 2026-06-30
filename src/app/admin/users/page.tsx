'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserProfile, PlanId } from '@/types';
import * as userService from '@/services/users';
import type { UserProfileWithPlan } from '@/services/users';
import * as subService from '@/services/subscriptions';
import { getAdminUserRanks, type AdminUserRank } from '@/services/ranking';
import { useRequireTab } from '@/lib/hooks/useRequireTab';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons';

export default function AdminUsersPage() {
  useRequireTab('users');
  const [profiles, setProfiles] = useState<UserProfileWithPlan[]>([]);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [planFor, setPlanFor] = useState<UserProfile | null>(null);
  const [planChoice, setPlanChoice] = useState<PlanId>('free');
  const [plansMap, setPlansMap] = useState<Record<string, PlanId>>({});
  const [ranksMap, setRanksMap] = useState<Record<string, AdminUserRank>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlans, setFilterPlans] = useState<PlanId[]>([]);

  const togglePlan = (plan: PlanId) => {
    setFilterPlans(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
    );
  };

  // Ranks só dependem do mount, não do search.
  useEffect(() => {
    (async () => {
      const ranks = await getAdminUserRanks();
      setRanksMap(ranks);
    })();
  }, []);

  // Debounce do search para evitar refetch a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Refetch quando o termo debouncado muda. < 2 chars usa lista padrão.
  useEffect(() => {
    (async () => {
      const list = await userService.getAllProfilesWithPlans(debouncedSearch);
      const map: Record<string, PlanId> = {};
      for (const p of list) map[p.userId] = p.plan;
      setProfiles(list);
      setPlansMap(map);
    })();
  }, [debouncedSearch]);

  const openPlanEditor = (profile: UserProfile) => {
    setPlanFor(profile);
    setPlanChoice(plansMap[profile.userId] ?? 'free');
  };

  const savePlan = async () => {
    if (!planFor) return;
    const sub = await subService.setUserPlan(planFor.userId, planChoice, 'admin');
    if (planChoice !== 'free' && sub.expiresAt) {
      fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'plan-subscribed',
          data: {
            userId: planFor.userId,
            planName: subService.PLANS[planChoice].name,
            expiresAt: new Date(sub.expiresAt).toLocaleDateString('pt-BR'),
          },
        }),
      }).catch(() => {});
    }
    // Atualiza apenas o plano desse user no map — não precisa refazer toda a lista
    setPlansMap(prev => ({ ...prev, [planFor.userId]: planChoice }));
    setPlanFor(null);
  };

  // Extract unique states and cities for the filter dropdowns
  const states = useMemo(() => {
    const set = new Set(profiles.map(p => p.state).filter(Boolean));
    return Array.from(set).sort();
  }, [profiles]);

  const cities = useMemo(() => {
    const filtered = filterState
      ? profiles.filter(p => p.state === filterState)
      : profiles;
    const set = new Set(filtered.map(p => p.city).filter(Boolean));
    return Array.from(set).sort();
  }, [profiles, filterState]);

  // Reset city filter when state changes
  const handleStateChange = (value: string) => {
    setFilterState(value);
    setFilterCity('');
  };

  // Filtered profiles — search já foi aplicado server-side em debouncedSearch.
  // Aqui só aplicamos state/city/plan client-side em cima do resultado.
  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (filterState && p.state !== filterState) return false;
      if (filterCity && p.city !== filterCity) return false;
      if (filterPlans.length > 0 && !filterPlans.includes(p.plan)) return false;
      return true;
    });
  }, [profiles, filterState, filterCity, filterPlans]);

  const exportCSV = () => {
    const headers = ['Nome','Email','WhatsApp','Plano','Estado','Cidade','Instagram','Seguidores IG','TikTok','Seguidores TT','Onboarding'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = filtered.map(p => [
      p.fullName,
      p.email,
      p.whatsapp,
      subService.PLANS[plansMap[p.userId] ?? 'free'].name,
      p.state,
      p.city,
      p.instagram,
      p.instagramFollowers,
      p.tiktok,
      p.tiktokFollowers,
      p.onboardingComplete ? 'Completo' : 'Pendente',
    ].map(escape).join(','));
    const csv = '﻿' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const selectStyle = "bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar nome ou email..."
          className={`${selectStyle} flex-1 min-w-[200px] max-w-[320px]`}
        />
        <select value={filterState} onChange={e => handleStateChange(e.target.value)} className={selectStyle}>
          <option value="">Todos os Estados</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectStyle} disabled={!filterState}>
          <option value="">Todas as Cidades</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
          {(['free', 'monthly', 'semester', 'yearly'] as PlanId[]).map(plan => {
            const active = filterPlans.includes(plan);
            return (
              <button
                key={plan}
                type="button"
                onClick={() => togglePlan(plan)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                {subService.PLANS[plan].name}
              </button>
            );
          })}
        </div>
        {(search || filterState || filterCity || filterPlans.length > 0) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterState(''); setFilterCity(''); setFilterPlans([]); }}>
            Limpar
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          Exportar CSV
        </Button>
        <span className="text-xs text-text-secondary ml-auto">
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Plan editor */}
      {planFor && (
        <Modal isOpen onClose={() => setPlanFor(null)} title={`Plano de ${planFor.fullName || planFor.email}`}>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Plano</label>
              <select
                value={planChoice}
                onChange={e => setPlanChoice(e.target.value as PlanId)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-popline-pink transition-colors"
              >
                <option value="free">Grátis</option>
                <option value="monthly">Mensal · R$ 49,90</option>
                <option value="semester">Semestral · R$ 239,40</option>
                <option value="yearly">Anual · R$ 358,80</option>
              </select>
            </div>
            <p className="text-xs text-text-secondary">
              Ao ativar, passa a valer por {subService.PLANS[planChoice].durationMonths || 0} mês(es).
              Modificador: {subService.PLANS[planChoice].modifier}x
              {subService.PLANS[planChoice].prizes ? ' · acesso a oportunidades exclusivas' : ''}.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setPlanFor(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={savePlan}>
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Profile Popup */}
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title="Perfil do Usuario">
          <div className="flex flex-col items-center gap-4">
            <Avatar src={selected.photoUrl} name={selected.fullName} size="xl" />
            <div className="text-center">
              <h3 className="text-lg font-bold">{selected.fullName || 'Sem nome'}</h3>
              <p className="text-sm text-text-secondary">{selected.email}</p>
              {selected.whatsapp && (
                <p className="text-sm text-text-secondary mt-1">WhatsApp: {selected.whatsapp}</p>
              )}
              {selected.bio && (
                <p className="text-sm text-text-secondary mt-3">{selected.bio}</p>
              )}
              {(selected.city || selected.state) && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-text-secondary">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {[selected.city, selected.state].filter(Boolean).join(' - ')}
                    {selected.neighborhood && ` · ${selected.neighborhood}`}
                    {selected.cep && ` · CEP ${selected.cep}`}
                  </span>
                </div>
              )}
              {selected.address && (
                <p className="text-xs text-text-secondary mt-1">{selected.address}</p>
              )}
              {(selected.instagram || selected.tiktok) && (
                <div className="flex flex-col gap-2 mt-4">
                  {selected.instagram && (
                    <div className="flex items-center justify-center gap-2">
                      <InstagramIcon className="w-4 h-4" />
                      <span className="text-sm">@{selected.instagram}</span>
                      {selected.instagramFollowers && (
                        <span className="text-xs text-text-secondary">{Number(selected.instagramFollowers).toLocaleString('pt-BR')} seguidores</span>
                      )}
                    </div>
                  )}
                  {selected.tiktok && (
                    <div className="flex items-center justify-center gap-2">
                      <TikTokIcon className="w-4 h-4" />
                      <span className="text-sm">@{selected.tiktok}</span>
                      {selected.tiktokFollowers && (
                        <span className="text-xs text-text-secondary">{Number(selected.tiktokFollowers).toLocaleString('pt-BR')} seguidores</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-text-secondary mt-3">
                Onboarding: {selected.onboardingComplete ? 'Completo' : 'Pendente'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Users Table/List */}
      <Card className="p-0 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Usuario</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Localizacao</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Ranking</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Plano</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Status</th>
                <th className="text-right text-sm text-text-secondary font-medium px-6 py-4">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => (
                <tr key={profile.userId} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={profile.photoUrl} name={profile.fullName} size="sm" />
                      <div>
                        <span className="font-medium">{profile.fullName || 'Sem nome'}</span>
                        <p className="text-xs text-text-secondary">{profile.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {profile.city && profile.state
                      ? `${profile.city} - ${profile.state}`
                      : <span className="text-text-secondary/50">—</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-xs text-text-secondary whitespace-nowrap">
                    <RankingCell rank={ranksMap[profile.userId]} />
                  </td>
                  <td className="px-6 py-4">
                    <PlanBadge plan={plansMap[profile.userId] || 'free'} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      profile.onboardingComplete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {profile.onboardingComplete ? 'Ativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openPlanEditor(profile)}>
                        Plano
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setSelected(profile)}>
                        Ver
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border">
          {filtered.map(profile => (
            <div key={profile.userId} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar src={profile.photoUrl} name={profile.fullName} size="sm" />
                <div>
                  <p className="font-medium text-sm">{profile.fullName || 'Sem nome'}</p>
                  <p className="text-xs text-text-secondary">
                    {profile.city && profile.state ? `${profile.city} - ${profile.state}` : profile.email}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelected(profile)}>
                Ver
              </Button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-text-secondary py-8">
            {profiles.length === 0 ? 'Nenhum usuario cadastrado.' : 'Nenhum usuario encontrado com esses filtros.'}
          </p>
        )}
      </Card>
    </div>
  );
}

function RankingCell({ rank }: { rank?: AdminUserRank }) {
  if (!rank || (rank.monthlyRank == null && rank.alltimeRank == null)) {
    return <span className="text-text-secondary/50">—</span>;
  }
  const parts: string[] = [];
  if (rank.monthlyRank != null) parts.push(`#${rank.monthlyRank} mensal`);
  if (rank.alltimeRank != null) parts.push(`#${rank.alltimeRank} geral`);
  return <span>{parts.join(' · ')}</span>;
}

function PlanBadge({ plan }: { plan: PlanId }) {
  const styles: Record<PlanId, string> = {
    free: 'bg-gray-500/20 text-gray-400',
    monthly: 'bg-blue-500/20 text-blue-400',
    semester: 'bg-popline-pink/20 text-popline-light',
    yearly: 'bg-amber-500/20 text-amber-400',
  };
  const labels: Record<PlanId, string> = {
    free: 'Grátis',
    monthly: 'Mensal',
    semester: 'Semestral',
    yearly: 'Anual',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[plan]}`}>
      {labels[plan]}
    </span>
  );
}
