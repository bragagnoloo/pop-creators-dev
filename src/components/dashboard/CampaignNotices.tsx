'use client';

import { useCallback, useState } from 'react';
import { CampaignNotice } from '@/types';
import * as noticesService from '@/services/notices';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';

interface Props {
  campaignId: string;
  userId: string;
  /** Notificado após marcar novos como lidos (pra parent atualizar badges). */
  onReadsChanged?: () => void;
}

export default function CampaignNotices({ campaignId, userId, onReadsChanged }: Props) {
  const [notices, setNotices] = useState<CampaignNotice[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const list = await noticesService.getCampaignNotices(campaignId, userId);
    setNotices(list);
    setLoaded(true);

    // Marca todos os não-lidos como lidos ao abrir
    const unreadIds = list.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      await noticesService.markNoticesAsRead(unreadIds, userId);
      // Atualiza estado local pra UI refletir de imediato
      setNotices(prev =>
        prev.map(n => (unreadIds.includes(n.id) ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      onReadsChanged?.();
    }
  }, [campaignId, userId, onReadsChanged]);

  useLoadOnMount(load, [load]);

  if (!loaded) {
    return (
      <div className="text-xs text-text-secondary italic">Carregando avisos...</div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className="text-xs text-text-secondary italic">Sem avisos nesta campanha.</div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Avisos</p>
      {notices.map(n => {
        const wasUnread = !n.isRead;
        const dateLabel = new Date(n.createdAt).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        return (
          <div
            key={n.id}
            className={`p-3 rounded-lg text-sm whitespace-pre-line border transition-colors ${
              wasUnread
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-background border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {wasUnread && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-black">
                  Novo
                </span>
              )}
              {!n.isGeneral && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-popline-pink/20 text-popline-light">
                  Direcionado
                </span>
              )}
              <span className="text-[11px] text-text-secondary">{dateLabel}</span>
            </div>
            <p>{n.content}</p>
          </div>
        );
      })}
    </div>
  );
}
