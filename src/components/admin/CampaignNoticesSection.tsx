'use client';

import { useCallback, useState } from 'react';
import { CampaignApplication, CampaignNotice, UserProfile } from '@/types';
import * as noticesService from '@/services/notices';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import Avatar from '@/components/ui/Avatar';

interface Props {
  campaignId: string;
  // Participantes aprovados (para seleção quando aviso é direcionado)
  approved: { application: CampaignApplication; profile: UserProfile | null }[];
}

export default function CampaignNoticesSection({ campaignId, approved }: Props) {
  const [notices, setNotices] = useState<CampaignNotice[]>([]);
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'general' | 'specific'>('general');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNotices(await noticesService.getCampaignNoticesAdmin(campaignId));
  }, [campaignId]);

  useLoadOnMount(load, [load]);

  const totalApproved = approved.length;

  const toggleRecipient = (userId: string) => {
    setRecipientIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async () => {
    setError(null);
    if (!content.trim()) {
      setError('Escreva o conteúdo do aviso.');
      return;
    }
    if (mode === 'specific' && recipientIds.length === 0) {
      setError('Selecione ao menos um destinatário.');
      return;
    }
    setSending(true);
    const result = await noticesService.createNotice({
      campaignId,
      content: content.trim(),
      isGeneral: mode === 'general',
      recipientIds: mode === 'specific' ? recipientIds : undefined,
    });
    setSending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setContent('');
    setRecipientIds([]);
    setMode('general');
    await load();
  };

  const handleDelete = async (id: string) => {
    await noticesService.deleteNotice(id);
    setConfirmDelete(null);
    await load();
  };

  const profileMap = new Map<string, UserProfile | null>();
  for (const row of approved) profileMap.set(row.application.userId, row.profile);

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-1">Avisos da campanha</h2>
      <p className="text-xs text-text-secondary mb-4">
        Comunicados enviados aos participantes aprovados. Avisos gerais aparecem para todos; específicos apenas para os destinatários escolhidos.
      </p>

      {/* Form novo aviso */}
      <div className="p-4 rounded-xl bg-background border border-border space-y-3 mb-4">
        <Textarea
          label="Novo aviso"
          rows={3}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Ex: A data da gravação foi adiada para sexta..."
        />

        <div className="flex gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="notice-mode"
              checked={mode === 'general'}
              onChange={() => setMode('general')}
              className="accent-popline-pink"
            />
            Geral (todos os {totalApproved} aprovados)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="notice-mode"
              checked={mode === 'specific'}
              onChange={() => setMode('specific')}
              className="accent-popline-pink"
              disabled={totalApproved === 0}
            />
            Específico (escolher destinatários)
          </label>
        </div>

        {mode === 'specific' && totalApproved > 0 && (
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1.5 bg-surface">
            {approved.map(row => (
              <label
                key={row.application.userId}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={recipientIds.includes(row.application.userId)}
                  onChange={() => toggleRecipient(row.application.userId)}
                  className="accent-popline-pink"
                />
                <Avatar src={row.profile?.photoUrl} name={row.profile?.fullName || ''} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{row.profile?.fullName || 'Sem nome'}</p>
                  <p className="text-xs text-text-secondary truncate">{row.profile?.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={handleSend} disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar aviso'}
          </Button>
        </div>
      </div>

      {/* Lista de avisos */}
      {notices.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">Nenhum aviso enviado ainda.</p>
      ) : (
        <div className="space-y-3">
          {notices.map(n => {
            const dateLabel = new Date(n.createdAt).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            });
            const totalRecipients = n.isGeneral ? totalApproved : (n.recipients?.length || 0);
            const readCount = n.readCount ?? 0;

            return (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-background border border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={n.isGeneral ? 'pink' : 'default'}>
                      {n.isGeneral ? 'Geral' : `${n.recipients?.length || 0} destinatário${(n.recipients?.length || 0) > 1 ? 's' : ''}`}
                    </Badge>
                    <span className="text-xs text-text-secondary">{dateLabel}</span>
                    <span className="text-xs text-text-secondary">
                      · lido por {readCount}/{totalRecipients}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(n.id)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
                <p className="text-sm whitespace-pre-line">{n.content}</p>
                {!n.isGeneral && n.recipients && n.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {n.recipients.map(userId => {
                      const p = profileMap.get(userId);
                      return (
                        <span
                          key={userId}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary"
                        >
                          {p?.fullName || p?.email || userId.slice(0, 8)}
                        </span>
                      );
                    })}
                  </div>
                )}
                {confirmDelete === n.id && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-text-secondary">Confirmar exclusão?</span>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(n.id)}>
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
