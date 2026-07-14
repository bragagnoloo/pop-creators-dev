'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as stagesService from '@/services/campaign-stages';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import { createClient } from '@/lib/supabase/client';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, UserProfile } from '@/types';

interface GuestItem {
  application: CampaignApplication;
  profile: UserProfile | null;
}

interface Props {
  campaignId: string;
  campaignTitle: string;
  whatsappLink: string | null;
  approved: GuestItem[];
  onChanged: () => void;
}

const WHATSAPP_REGEX = /^https?:\/\/(chat\.whatsapp\.com|wa\.me)\/.+/i;

export default function Stage01Guests({
  campaignId,
  campaignTitle,
  whatsappLink,
  approved,
  onChanged,
}: Props) {
  // --- Link do WhatsApp (idêntico ao Stage01Selection) ---
  const [link, setLink] = useState(whatsappLink ?? '');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSavedFlash, setLinkSavedFlash] = useState(false);

  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [disqualifyFor, setDisqualifyFor] = useState<GuestItem | null>(null);

  // --- Busca / adição de convidados ---
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useLoadOnMount(async () => {
    setAllProfiles(await userService.getAllProfiles());
  }, []);

  const approvedIds = useMemo(
    () => new Set(approved.map(g => g.application.userId)),
    [approved]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return allProfiles
      .filter(p => !approvedIds.has(p.userId))
      .filter(p => `${p.fullName} ${p.email}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, allProfiles, approvedIds]);

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

  const handleAddGuest = async (profile: UserProfile) => {
    setAddError(null);
    setAddingId(profile.userId);
    const result = await campaignService.addCampaignGuest(campaignId, profile.userId);
    setAddingId(null);
    if (!result.success) {
      setAddError(result.error);
      return;
    }
    // Email informando que está participando da campanha (best-effort).
    fetch('/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'campaign-participation',
        data: { userId: profile.userId, campaignTitle },
      }),
    }).catch(() => {});
    setQuery('');
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

  const handleRemove = async (applicationId: string) => {
    setBusyAppId(applicationId);
    const result = await campaignService.removeCampaignGuest(applicationId);
    setBusyAppId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    onChanged();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 01 — Adicionar Convidados</h3>
      <p className="text-xs text-text-secondary mb-4">
        Campanha por convite: busque e adicione os participantes diretamente. Ao ser adicionado, o
        convidado passa a ver a campanha e recebe um email informando que está participando.
      </p>

      <div className="space-y-4">
        {/* Link do grupo do WhatsApp */}
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

        {/* Busca de usuários */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Adicionar convidado
          </label>
          <Input
            label=""
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
          />
          {addError && <p className="mt-1 text-xs text-red-400">{addError}</p>}
          {query.trim().length >= 2 && (
            <div className="mt-2 space-y-2">
              {results.length === 0 ? (
                <p className="text-sm text-text-secondary italic">Nenhum usuário encontrado.</p>
              ) : (
                results.map(p => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={p.photoUrl} name={p.fullName || ''} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.fullName || 'Sem nome'}</p>
                        <p className="text-xs text-text-secondary truncate">{p.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={addingId === p.userId}
                      onClick={() => handleAddGuest(p)}
                    >
                      {addingId === p.userId ? '...' : 'Adicionar'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lista de convidados */}
        {approved.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            Nenhum convidado adicionado ainda. Use a busca acima para adicionar participantes.
          </p>
        ) : (
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Convidados ({approved.length})
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-red-400 font-medium">Desclassificado</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!text-xs !text-red-400 hover:!text-red-300"
                          disabled={busy}
                          onClick={() => handleRemove(item.application.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={isJoined ? 'secondary' : 'primary'}
                          disabled={busy}
                          onClick={() => handleToggleJoined(item.application.id, !isJoined)}
                        >
                          {busy ? '...' : isJoined ? 'No grupo ✓' : 'Marcar entrou no grupo'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!text-xs !text-red-400 hover:!text-red-300"
                          onClick={() => setDisqualifyFor(item)}
                        >
                          Desclassificar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!text-xs text-text-secondary hover:!text-white"
                          disabled={busy}
                          onClick={() => handleRemove(item.application.id)}
                        >
                          Remover
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
