'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserProfile, PlanId } from '@/types';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons';

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [planFor, setPlanFor] = useState<UserProfile | null>(null);
  const [planChoice, setPlanChoice] = useState<PlanId>('free');
  const [plansMap, setPlansMap] = useState<Record<string, PlanId>>({});
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const refreshPlans = async (list: UserProfile[]) => {
    const map: Record<string, PlanId> = {};
    await Promise.all(
      list.map(async p => {
        map[p.userId] = await subService.getUserPlan(p.userId);
      })
    );
    setPlansMap(map);
  };

  useEffect(() => {
    (async () => {
      const list = await userService.getAllProfiles();
      setProfiles(list);
      refreshPlans(list);
    })();
  }, []);

  const openPlanEditor = async (profile: UserProfile) => {
    setPlanFor(profile);
    setPlanChoice(await subService.getUserPlan(profile.userId));
  };

  const savePlan = async () => {
    if (!planFor) return;
    await subService.setUserPlan(planFor.userId, planChoice, 'admin');
    refreshPlans(profiles);
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

  // Filtered profiles
  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (filterState && p.state !== filterState) return false;
      if (filterCity && p.city !== filterCity) return false;
      return true;
    });
  }, [profiles, filterState, filterCity]);

  const selectStyle = "bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-text-secondary font-medium">Filtrar:</span>
        </div>
        <select value={filterState} onChange={e => handleStateChange(e.target.value)} className={selectStyle}>
          <option value="">Todos os Estados</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectStyle} disabled={!filterState}>
          <option value="">Todas as Cidades</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterState || filterCity) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterState(''); setFilterCity(''); }}>
            Limpar
          </Button>
        )}
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
              {subService.PLANS[planChoice].prizes ? ' · acesso a prêmios exclusivos' : ''}.
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
