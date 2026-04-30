'use client';

import { useState } from 'react';
import { Withdrawal, UserProfile } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as walletService from '@/services/wallet';
import * as userService from '@/services/users';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';

type Filter = 'requested' | 'paid' | 'all';

export default function AdminSaquesPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});
  const [filter, setFilter] = useState<Filter>('requested');

  const load = async () => {
    const all = await walletService.getAllWithdrawals();
    setWithdrawals(all);
    const map: Record<string, UserProfile | null> = {};
    for (const w of all) {
      if (!(w.userId in map)) map[w.userId] = await userService.getProfile(w.userId);
    }
    setProfiles(map);
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

  const visible = withdrawals.filter(w => (filter === 'all' ? true : w.status === filter));

  const counts = {
    requested: withdrawals.filter(w => w.status === 'requested').length,
    paid: withdrawals.filter(w => w.status === 'paid').length,
    all: withdrawals.length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Saques</h1>

      <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl mb-6">
        {(['requested', 'paid', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === f ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
            }`}
          >
            {f === 'requested' ? 'Pendentes' : f === 'paid' ? 'Pagos' : 'Todos'}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-white/5'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary">Nenhum saque nesta aba.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(w => {
            const profile = profiles[w.userId];
            return (
              <Card key={w.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={profile?.photoUrl} name={profile?.fullName || ''} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{profile?.fullName || 'Sem nome'}</p>
                      <p className="text-xs text-text-secondary truncate">{profile?.email}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        <span className="font-medium text-text-primary">
                          {walletService.pixKeyTypeLabels[w.pixKeyType]}:
                        </span>{' '}
                        {w.pixKey}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold">{walletService.formatBRL(w.amount)}</p>
                      <p className="text-xs text-text-secondary">
                        Solicitado em {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {w.status === 'requested' ? (
                      <Button size="sm" onClick={() => handlePaid(w.id)}>
                        Marcar como pago
                      </Button>
                    ) : (
                      <Badge variant="success">Pago</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
