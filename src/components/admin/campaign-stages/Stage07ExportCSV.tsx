'use client';

import { useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { CampaignApplication, CampaignDelivery, UserProfile } from '@/types';

interface RowItem {
  application: CampaignApplication;
  profile: UserProfile | null;
  deliveries: CampaignDelivery[];
}

interface Props {
  campaignId: string;
  rows: RowItem[];
}

export default function Stage07ExportCSV({ campaignId, rows }: Props) {
  const stats = useMemo(() => {
    const eligible = rows
      .filter(r => !r.application.disqualifiedAt)
      .map(r => ({
        ...r,
        confirmedDeliveries: r.deliveries.filter(d => d.publicationStatus === 'confirmed'),
      }));
    const participants = eligible.filter(r => r.confirmedDeliveries.length > 0).length;
    const totalConfirmed = eligible.reduce((sum, r) => sum + r.confirmedDeliveries.length, 0);
    // Inclui apenas deliveries de participantes não-desclassificados.
    const allDeliveries = eligible.reduce((sum, r) => sum + r.deliveries.length, 0);
    return { participants, totalConfirmed, allDeliveries, eligible };
  }, [rows]);

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 07 — CSV para a marca</h3>
      <p className="text-xs text-text-secondary mb-4">
        Baixe o CSV com participantes, URL do vídeo e URL da publicação — apenas os que têm publicação
        confirmada. Acentos e vírgulas saem corretos no Excel pt-BR.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Participantes" value={stats.participants} />
        <Stat label="Publicações confirmadas" value={stats.totalConfirmed} />
        <Stat label="Total de entregas" value={stats.allDeliveries} />
      </div>

      {stats.eligible.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-text-secondary font-medium mb-2">
            Vão entrar no CSV:
          </p>
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {stats.eligible
              .filter(r => r.confirmedDeliveries.length > 0)
              .map(r => (
                <li key={r.application.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-text-primary">{r.profile?.fullName ?? 'Sem nome'}</span>
                  <Badge variant="success">{r.confirmedDeliveries.length}</Badge>
                </li>
              ))}
          </ul>
        </div>
      )}

      {stats.totalConfirmed === 0 ? (
        <Button disabled>Sem publicações confirmadas</Button>
      ) : (
        <a
          href={`/api/admin/campaigns/${campaignId}/export/csv`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Baixar CSV</Button>
        </a>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-xl bg-background border border-border">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
