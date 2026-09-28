'use client';

import { useEffect, useMemo, useState } from 'react';
import { Withdrawal, UserProfile } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as walletService from '@/services/wallet';
import * as userService from '@/services/users';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';

type Filter = 'requested' | 'paid' | 'flagged' | 'all';

// Normaliza o nome pra comparar titular vs. cadastro sem falsos positivos por
// acento/caixa/espaço extra.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AdminSaquesPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});
  // null = ainda carregando. Sem essa distinção, o primeiro render mostraria
  // todo saque como "outras campanhas" antes das campanhas chegarem.
  const [creditCampaigns, setCreditCampaigns] =
    useState<Map<string, walletService.CreditCampaign> | null>(null);
  const [filter, setFilter] = useState<Filter>('requested');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [flagFor, setFlagFor] = useState<Withdrawal | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagLoading, setFlagLoading] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // Debounce do search para evitar refiltrar a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    const all = await walletService.getAllWithdrawals();
    setWithdrawals(all);

    // Uma query só para todos os perfis. Antes era um getProfile por creator,
    // em sequência (cada um esperando o anterior): com 25 creators eram 25
    // idas e voltas, e durante todas elas os cards ficavam sem nome, sem email
    // e sem foto — o que faz a lista parecer incompleta enquanto carrega.
    const ids = [...new Set(all.map(w => w.userId))];
    const [byId, credits] = await Promise.all([
      userService.getProfilesByIds(ids),
      walletService.getCreditCampaignsByUsers(ids),
    ]);
    const map: Record<string, UserProfile | null> = {};
    for (const id of ids) map[id] = byId.get(id) ?? null;
    setProfiles(map);
    setCreditCampaigns(credits);
  };

  useLoadOnMount(load);

  const handlePaid = async (id: string) => {
    const w = withdrawals.find(x => x.id === id);
    await walletService.markWithdrawalPaid(id);
    if (w) {
      fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'withdrawal-paid',
          data: { userId: w.userId, amount: w.amount, pixKeyType: w.pixKeyType },
        }),
      }).catch(() => {});
    }
    load();
  };

  const openFlag = (w: Withdrawal) => {
    setFlagFor(w);
    setFlagReason('');
    setFlagError(null);
  };

  const confirmFlag = async () => {
    if (!flagFor) return;
    setFlagLoading(true);
    setFlagError(null);
    const result = await walletService.flagWithdrawal(flagFor.id, flagReason.trim());
    setFlagLoading(false);
    if (!result.success) {
      setFlagError(result.error);
      return;
    }
    setFlagFor(null);
    load();
  };

  // Busca por nome ou email. Reaproveita normalizeName para ignorar acento e
  // caixa — "romao" acha "Daniela Romão". Cai no profileNameSnapshot quando o
  // perfil ainda não chegou ou foi apagado, que é o mesmo nome que o card usa.
  const searched = useMemo(() => {
    const query = normalizeName(debouncedSearch);
    if (!query) return withdrawals;
    return withdrawals.filter(w => {
      const profile = profiles[w.userId];
      const name = profile?.fullName ?? w.profileNameSnapshot ?? '';
      return normalizeName(`${name} ${profile?.email ?? ''}`).includes(query);
    });
  }, [withdrawals, profiles, debouncedSearch]);

  const visible = searched.filter(w => (filter === 'all' ? true : w.status === filter));

  // Contagens seguem a busca: se ficassem no total, a aba mostraria "Pagos 124"
  // e abriria vazia por causa do filtro de nome.
  const counts = {
    requested: searched.filter(w => w.status === 'requested').length,
    paid:      searched.filter(w => w.status === 'paid').length,
    flagged:   searched.filter(w => w.status === 'flagged').length,
    all:       searched.length,
  };

  const searching = normalizeName(debouncedSearch).length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Saques</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl flex-wrap gap-1 self-start">
          {(['requested', 'paid', 'flagged', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === f ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              {f === 'requested' ? 'Pendentes' : f === 'paid' ? 'Pagos' : f === 'flagged' ? 'Notificados' : 'Todos'}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-white/5'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:flex-1 sm:max-w-[340px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nome ou email..."
            aria-label="Buscar saque por nome ou email do creator"
            className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors min-h-11"
          />
          {search && (
            <Button size="sm" variant="ghost" onClick={() => setSearch('')}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary">
            {searching ? 'Nenhum saque para essa busca nesta aba.' : 'Nenhum saque nesta aba.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary pb-1">
            Exibindo <span className="text-text-primary font-medium">{visible.length}</span> de{' '}
            {counts.all} saque{counts.all === 1 ? '' : 's'}
            {searching && ` (filtrados de ${withdrawals.length})`} ·{' '}
            <span className="text-text-primary font-medium">
              {walletService.formatBRL(visible.reduce((acc, w) => acc + w.amount, 0))}
            </span>{' '}
            · {new Set(visible.map(w => w.userId)).size} creators · sem paginação
          </p>
          {visible.map(w => {
            const profile = profiles[w.userId];
            const informedName = w.pixHolderName ?? '—';
            const registeredName = profile?.fullName ?? w.profileNameSnapshot ?? '—';
            const namesDiffer =
              w.pixHolderName != null &&
              profile?.fullName != null &&
              normalizeName(w.pixHolderName) !== normalizeName(profile.fullName);
            return (
              <Card key={w.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={profile?.photoUrl} name={profile?.fullName || ''} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{profile?.fullName || 'Sem nome'}</p>
                      <p className="text-xs text-text-secondary truncate">{profile?.email}</p>
                      <p className="text-xs text-text-secondary mt-2">
                        <span className="font-medium text-text-primary">
                          {walletService.pixKeyTypeLabels[w.pixKeyType]}:
                        </span>{' '}
                        {w.pixKey}
                      </p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <p>
                          <span className="text-text-secondary">Titular informado:</span>{' '}
                          <span className={namesDiffer ? 'text-red-400 font-medium' : 'text-text-primary'}>
                            {informedName}
                          </span>
                        </p>
                        <p>
                          <span className="text-text-secondary">No cadastro:</span>{' '}
                          <span className={namesDiffer ? 'text-red-400 font-medium' : 'text-text-primary'}>
                            {registeredName}
                          </span>
                        </p>
                        {namesDiffer && (
                          <p className="text-red-400 text-[11px] mt-1">
                            ⚠ Divergência detectada — verifique antes de pagar.
                          </p>
                        )}
                      </div>
                      {creditCampaigns && (() => {
                        const { items, unresolved } = walletService.buildWithdrawalBreakdown(
                          w,
                          creditCampaigns
                        );
                        if (items.length === 0 && unresolved === 0) return null;
                        return (
                          <div className="mt-2">
                            <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
                              Campanhas neste saque
                            </p>
                            <ul className="text-xs space-y-0.5">
                              {items.map(item => (
                                <li key={item.campaignId} className="flex items-baseline gap-2">
                                  <span className="text-text-primary truncate">
                                    {item.campaignTitle}
                                  </span>
                                  <span className="text-text-secondary shrink-0">
                                    {walletService.formatBRL(item.amount)}
                                  </span>
                                </li>
                              ))}
                              {unresolved > 0 && (
                                <li className="flex items-baseline gap-2 text-text-secondary">
                                  <span className="truncate italic">
                                    Campanha não identificada
                                  </span>
                                  <span className="shrink-0">
                                    {walletService.formatBRL(unresolved)}
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })()}
                      {w.status === 'flagged' && w.flagReason && (
                        <p className="text-xs text-amber-300 mt-2">
                          Motivo: {w.flagReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold">{walletService.formatBRL(w.amount)}</p>
                      <p className="text-xs text-text-secondary">
                        Solicitado em {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {w.status === 'flagged' && w.flaggedAt && (
                        <p className="text-xs text-amber-300 mt-0.5">
                          Notificado em {new Date(w.flaggedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    {w.status === 'requested' ? (
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => handlePaid(w.id)}>
                          Marcar como pago
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openFlag(w)}>
                          Notificar divergência
                        </Button>
                      </div>
                    ) : w.status === 'paid' ? (
                      <Badge variant="success">Pago</Badge>
                    ) : (
                      <Badge variant="warning">Notificado</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {flagFor && (
        <Modal
          isOpen
          onClose={() => (flagLoading ? undefined : setFlagFor(null))}
          title="Notificar divergência"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              O saque de <strong className="text-text-primary">{walletService.formatBRL(flagFor.amount)}</strong>{' '}
              será interrompido. O valor volta para o saldo disponível do creator e ele recebe um email
              de conformidade explicando o motivo.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">
                Motivo adicional (opcional)
              </label>
              <textarea
                value={flagReason}
                onChange={e => setFlagReason(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Ex: nome do titular diverge do cadastro"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors resize-none"
              />
              <p className="text-[11px] text-text-secondary text-right">{flagReason.length}/500</p>
            </div>
            {flagError && <p className="text-xs text-red-400">{flagError}</p>}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setFlagFor(null)}
                disabled={flagLoading}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={confirmFlag} disabled={flagLoading}>
                {flagLoading ? 'Notificando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
