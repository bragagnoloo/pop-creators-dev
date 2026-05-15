'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { CampaignApplication, CampaignDelivery, UserProfile } from '@/types';

interface RowItem {
  application: CampaignApplication;
  profile: UserProfile | null;
  deliveries: CampaignDelivery[];
}

interface Props {
  rows: RowItem[];
  /** dateISO é "YYYY-MM-DD" no fuso local — caller normaliza para timestamptz. */
  onSetDate: (deliveryId: string, dateLocal: string) => Promise<void> | void;
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function Stage03DeliveryDates({ rows, onSetDate }: Props) {
  const [bulkDate, setBulkDate] = useState('');
  const [applying, setApplying] = useState(false);

  const eligibleRows = rows.filter(r => !r.application.disqualifiedAt);
  const allDeliveries = eligibleRows.flatMap(r => r.deliveries);
  const total = allDeliveries.length;
  const withDate = allDeliveries.filter(d => !!d.scheduledDate).length;
  const missing = total - withDate;

  const handleApplyAll = async () => {
    if (!bulkDate || missing === 0) return;
    setApplying(true);
    for (const d of allDeliveries) {
      if (!d.scheduledDate) {
        await onSetDate(d.id, bulkDate);
      }
    }
    setApplying(false);
    setBulkDate('');
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 03 — Datas de entrega</h3>
      <p className="text-xs text-text-secondary mb-4">
        Atribua a data de entrega de cada vídeo. Use o campo abaixo para aplicar a mesma data
        a todos os deliveries que ainda não foram preenchidos.
      </p>

      <div className="mb-4 p-3 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {withDate} de {total} deliveries com data
          </p>
          <p className="text-xs text-text-secondary">
            {missing > 0
              ? `${missing} pendente${missing > 1 ? 's' : ''} de data.`
              : 'Todas as datas foram definidas.'}
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            type="date"
            value={bulkDate}
            min={todayISO()}
            onChange={e => setBulkDate(e.target.value)}
            disabled={missing === 0}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
          />
          <Button
            size="sm"
            onClick={handleApplyAll}
            disabled={!bulkDate || missing === 0 || applying}
          >
            {applying ? 'Aplicando...' : 'Aplicar a vazios'}
          </Button>
        </div>
      </div>

      {eligibleRows.length === 0 ? (
        <p className="text-sm text-text-secondary italic">Nenhum aprovado para atribuir datas.</p>
      ) : (
        <ul className="space-y-3">
          {eligibleRows.map(row => (
            <li key={row.application.id} className="p-3 rounded-xl border border-border bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={row.profile?.photoUrl} name={row.profile?.fullName || ''} size="sm" />
                <p className="text-sm font-medium truncate">{row.profile?.fullName || 'Sem nome'}</p>
              </div>
              <div className="space-y-1.5">
                {row.deliveries.map(d => (
                  <DeliveryDateRow key={`${d.id}-${d.scheduledDate ?? 'n'}`} delivery={d} onSave={onSetDate} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeliveryDateRow({
  delivery,
  onSave,
}: {
  delivery: CampaignDelivery;
  onSave: (deliveryId: string, dateISO: string) => Promise<void> | void;
}) {
  const initial = delivery.scheduledDate ? delivery.scheduledDate.split('T')[0] : '';
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = draft !== initial;

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await onSave(delivery.id, draft);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-text-secondary w-20 shrink-0">Entrega {delivery.index}</span>
      <input
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
      />
      <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={handleSave}>
        {saving ? '...' : savedFlash ? 'Salvo ✓' : 'Salvar'}
      </Button>
    </div>
  );
}
