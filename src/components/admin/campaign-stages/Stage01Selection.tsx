'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import * as stagesService from '@/services/campaign-stages';
import { createClient } from '@/lib/supabase/client';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, UserProfile } from '@/types';

interface ApprovedItem {
  application: CampaignApplication;
  profile: UserProfile | null;
}

interface Props {
  campaignId: string;
  whatsappLink: string | null;
  approved: ApprovedItem[];
  pending: ApprovedItem[];
  onChanged: () => void;
  onDecide: (applicationId: string, status: 'approved' | 'rejected') => Promise<void>;
}

const WHATSAPP_REGEX = /^https?:\/\/(chat\.whatsapp\.com|wa\.me)\/.+/i;

export default function Stage01Selection({
  campaignId,
  whatsappLink,
  approved,
  pending,
  onChanged,
  onDecide,
}: Props) {
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const handleDecide = async (id: string, status: 'approved' | 'rejected') => {
    setDecidingId(id);
    await onDecide(id, status);
    setDecidingId(null);
  };
  const [link, setLink] = useState(whatsappLink ?? '');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSavedFlash, setLinkSavedFlash] = useState(false);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [disqualifyFor, setDisqualifyFor] = useState<ApprovedItem | null>(null);

  const handleSaveLink = async () => {
    setLinkError(null);
    const trimmed = link.trim();
    if (trimmed && !WHATSAPP_REGEX.test(trimmed)) {
      setLinkError('Use um link do tipo https://chat.whatsapp.com/... ou https://wa.me/...');
      return;
    }
    setLinkSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ whatsapp_group_link: trimmed || null })
      .eq('id', campaignId);
    setLinkSaving(false);
    if (error) {
      setLinkError(error.message);
      return;
    }
    setLinkSavedFlash(true);
    setTimeout(() => setLinkSavedFlash(false), 2000);
    onChanged();
  };

  const handleToggleJoined = async (applicationId: string, joined: boolean) => {
    setBusyAppId(applicationId);
    const result = await stagesService.markJoinedGroup(applicationId, joined);
    setBusyAppId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    onChanged();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 01 — Seleção</h3>
      <p className="text-xs text-text-secondary mb-4">
        Cole o link do grupo do WhatsApp e marque cada aprovado conforme confirmar presença.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Link do grupo do WhatsApp
          </label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              maxLength={500}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
              inputMode="url"
            />
            <Button size="sm" variant="secondary" onClick={handleSaveLink} disabled={linkSaving}>
              {linkSaving ? 'Salvando...' : 'Salvar link'}
            </Button>
            {linkSavedFlash && (
              <span className="text-xs text-emerald-400 self-center">Salvo ✓</span>
            )}
          </div>
          {linkError && <p className="mt-1 text-xs text-red-400">{linkError}</p>}
        </div>

        {pending.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Candidaturas pendentes ({pending.length})
            </p>
            <div className="space-y-2">
              {pending.map(item => {
                const busy = decidingId === item.application.id;
                return (
                  <div
                    key={item.application.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={item.profile?.photoUrl}
                        name={item.profile?.fullName || ''}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.profile?.fullName || 'Sem nome'}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {item.profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => handleDecide(item.application.id, 'rejected')}
                      >
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => handleDecide(item.application.id, 'approved')}
                      >
                        {busy ? '...' : 'Aprovar'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {approved.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            Nenhum participante aprovado ainda. Aprove candidaturas primeiro.
          </p>
        ) : (
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Aprovados ({approved.length})
            </p>
            <div className="space-y-2">
              {approved.map(item => {
                const isDisqualified = !!item.application.disqualifiedAt;
                const isJoined = !!item.application.joinedWhatsappGroup;
                const busy = busyAppId === item.application.id;
                return (
                  <div
                    key={item.application.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={item.profile?.photoUrl}
                        name={item.profile?.fullName || ''}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.profile?.fullName || 'Sem nome'}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {item.profile?.email}
                        </p>
                      </div>
                    </div>
                    {isDisqualified ? (
                      <span className="text-xs text-red-400 font-medium">Desclassificado</span>
                    ) : (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={isJoined ? 'secondary' : 'primary'}
                          disabled={busy}
                          onClick={() => handleToggleJoined(item.application.id, !isJoined)}
                        >
                          {busy
                            ? '...'
                            : isJoined
                              ? 'No grupo ✓'
                              : 'Marcar entrou no grupo'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!text-xs !text-red-400 hover:!text-red-300"
                          onClick={() => setDisqualifyFor(item)}
                        >
                          Desclassificar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {disqualifyFor && (
        <DisqualifyModal
          applicationId={disqualifyFor.application.id}
          participantName={disqualifyFor.profile?.fullName ?? ''}
          onClose={() => setDisqualifyFor(null)}
          onDone={() => {
            setDisqualifyFor(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
