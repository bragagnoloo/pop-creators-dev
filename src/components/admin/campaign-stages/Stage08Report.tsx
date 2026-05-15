'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Props {
  campaignId: string;
}

export default function Stage08Report({ campaignId }: Props) {
  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 08 — Relatório final</h3>
      <p className="text-xs text-text-secondary mb-4">
        Abra o relatório imprimível com bignumbers, gráficos e detalhamento por participante.
        Use Cmd+P (Ctrl+P) para salvar como PDF.
      </p>

      <Link href={`/admin/campaigns/${campaignId}/relatorio`} target="_blank" rel="noopener noreferrer">
        <Button>Abrir relatório imprimível →</Button>
      </Link>
    </Card>
  );
}
