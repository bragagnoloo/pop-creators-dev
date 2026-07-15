'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import { createClient } from '@/lib/supabase/client';
import * as briefingsService from '@/services/briefings';

interface Props {
  campaignId: string;
  campaignTitle: string;
  initialBriefing: string | null;
  initialBriefingFileUrl: string | null;
  deliveryCount: number;
  onSaved: () => void;
}

const BUCKET = 'campaign-briefings';

/**
 * Bloco reutilizável de briefing (texto + arquivo). Gerencia seu próprio estado
 * e delega a persistência aos handlers recebidos — assim serve tanto para o
 * briefing único (grava em campaigns) quanto por entregável (grava em
 * campaign_briefings).
 */
function BriefingBlock({
  title,
  initialText,
  initialFilePath,
  pathPrefix,
  onSaveText,
  onUploadFile,
  onRemoveFile,
}: {
  title?: string;
  initialText: string | null;
  initialFilePath: string | null;
  pathPrefix: string;
  onSaveText: (text: string) => Promise<{ ok: boolean; error?: string }>;
  onUploadFile: (path: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveFile: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [text, setText] = useState(initialText ?? '');
  const [filePath, setFilePath] = useState<string | null>(initialFilePath);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveText = async () => {
    setSaving(true);
    setError(null);
    const res = await onSaveText(text);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Falha ao salvar.');
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleFileUploaded = async (path: string) => {
    setError(null);
    const res = await onUploadFile(path);
    if (!res.ok) {
      setError(res.error ?? 'Falha ao salvar o arquivo.');
      return;
    }
    setFilePath(path);
  };

  const handleFileRemove = async () => {
    if (!filePath) return;
    setError(null);
    const res = await onRemoveFile();
    if (!res.ok) {
      setError(res.error ?? 'Falha ao remover o arquivo.');
      return;
    }
    // best-effort: remove o objeto do storage (campanha já está consistente)
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([filePath]);
    setFilePath(null);
  };

  return (
    <div className={title ? 'rounded-xl border border-border p-4 space-y-4' : 'space-y-4'}>
      {title && <p className="text-sm font-semibold">{title}</p>}
      <div>
        <Textarea
          label="Briefing (texto)"
          placeholder="Cole aqui o briefing detalhado, requisitos, referências..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
        />
        <div className="mt-2 flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={handleSaveText} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar texto'}
          </Button>
          {savedFlash && <span className="text-xs text-emerald-400">Salvo ✓</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Briefing (arquivo)
        </label>
        <FileUpload
          bucket={BUCKET}
          pathPrefix={pathPrefix}
          accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx"
          currentPath={filePath}
          onUploaded={handleFileUploaded}
          onRemove={handleFileRemove}
          label="Anexar briefing"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export default function Stage02Briefing({
  campaignId,
  campaignTitle,
  initialBriefing,
  initialBriefingFileUrl,
  deliveryCount,
  onSaved,
}: Props) {
  const multi = (deliveryCount ?? 1) > 1;

  const [briefings, setBriefings] = useState<briefingsService.CampaignBriefing[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifiedFlash, setNotifiedFlash] = useState(false);

  useLoadOnMount(async () => {
    if (multi) {
      setBriefings(await briefingsService.getCampaignBriefings(campaignId));
    }
    setLoaded(true);
  }, [campaignId, multi]);

  const byIndex = (i: number) => briefings.find(b => b.index === i) ?? null;

  const handleNotifyEveryone = async () => {
    setNotifying(true);
    await fetch('/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'briefing-published',
        data: {
          campaignId,
          campaignTitle,
          // No modo múltiplo o email é genérico (aponta pro painel da campanha).
          briefingText: multi ? null : initialBriefing,
          briefingFileUrl: multi ? null : initialBriefingFileUrl,
        },
      }),
    }).catch(() => {});
    setNotifying(false);
    setNotifiedFlash(true);
    setTimeout(() => setNotifiedFlash(false), 3000);
  };

  // Handlers do briefing ÚNICO (grava direto em campaigns).
  const singleSaveText = async (text: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ briefing: text || null })
      .eq('id', campaignId);
    if (error) return { ok: false, error: error.message };
    onSaved();
    return { ok: true };
  };
  const singleUploadFile = async (path: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ briefing_file_url: path })
      .eq('id', campaignId);
    if (error) return { ok: false, error: error.message };
    onSaved();
    return { ok: true };
  };
  const singleRemoveFile = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ briefing_file_url: null })
      .eq('id', campaignId);
    if (error) return { ok: false, error: error.message };
    onSaved();
    return { ok: true };
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 02 — Briefing</h3>
      <p className="text-xs text-text-secondary mb-4">
        {multi
          ? `Esta campanha tem ${deliveryCount} entregáveis. Adicione um briefing (texto e/ou arquivo) para cada entregável. Os aprovados veem o briefing correspondente a cada entrega no dashboard.`
          : 'Adicione o briefing em texto, anexe um arquivo, ou ambos. Os aprovados podem visualizar no dashboard.'}
      </p>

      <div className="space-y-4">
        {!multi ? (
          <BriefingBlock
            initialText={initialBriefing}
            initialFilePath={initialBriefingFileUrl}
            pathPrefix={campaignId}
            onSaveText={singleSaveText}
            onUploadFile={singleUploadFile}
            onRemoveFile={singleRemoveFile}
          />
        ) : !loaded ? (
          <p className="text-sm text-text-secondary italic">Carregando briefings…</p>
        ) : (
          Array.from({ length: deliveryCount }, (_, i) => i + 1).map(idx => {
            const existing = byIndex(idx);
            // Semente do entregável 1: se ainda não há briefing por index, aproveita
            // o briefing único que possa ter sido digitado na criação da campanha.
            const seedText = existing?.briefing ?? (idx === 1 ? initialBriefing : null);
            return (
              <BriefingBlock
                key={idx}
                title={`Entregável ${idx}`}
                initialText={seedText}
                initialFilePath={existing?.briefingFileUrl ?? null}
                pathPrefix={`${campaignId}/${idx}`}
                onSaveText={async text => {
                  const res = await briefingsService.upsertBriefingText(campaignId, idx, text);
                  if (res.ok) onSaved();
                  return res;
                }}
                onUploadFile={async path => {
                  const res = await briefingsService.setBriefingFile(campaignId, idx, path);
                  if (res.ok) onSaved();
                  return res;
                }}
                onRemoveFile={async () => {
                  const res = await briefingsService.clearBriefingFile(campaignId, idx);
                  if (res.ok) onSaved();
                  return res;
                }}
              />
            );
          })
        )}

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-text-secondary mb-2">
            Envie um email a todos os aprovados avisando que o briefing está disponível.
          </p>
          <Button size="sm" onClick={handleNotifyEveryone} disabled={notifying}>
            {notifying
              ? 'Enviando...'
              : notifiedFlash
                ? 'Emails enviados ✓'
                : 'Notificar aprovados por email'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
