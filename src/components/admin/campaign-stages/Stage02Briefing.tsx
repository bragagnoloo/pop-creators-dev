'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { createClient } from '@/lib/supabase/client';

interface Props {
  campaignId: string;
  campaignTitle: string;
  initialBriefing: string | null;
  initialBriefingFileUrl: string | null;
  onSaved: () => void;
}

const BUCKET = 'campaign-briefings';

export default function Stage02Briefing({
  campaignId,
  campaignTitle,
  initialBriefing,
  initialBriefingFileUrl,
  onSaved,
}: Props) {
  const [text, setText] = useState(initialBriefing ?? '');
  const [filePath, setFilePath] = useState<string | null>(initialBriefingFileUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifiedFlash, setNotifiedFlash] = useState(false);

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
          briefingText: text || null,
          briefingFileUrl: filePath,
        },
      }),
    }).catch(() => {});
    setNotifying(false);
    setNotifiedFlash(true);
    setTimeout(() => setNotifiedFlash(false), 3000);
  };

  const handleSaveText = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('campaigns')
      .update({ briefing: text || null })
      .eq('id', campaignId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    onSaved();
  };

  const handleFileUploaded = async (path: string) => {
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('campaigns')
      .update({ briefing_file_url: path })
      .eq('id', campaignId);
    if (err) {
      setError(err.message);
      return;
    }
    setFilePath(path);
    onSaved();
  };

  const handleFileRemove = async () => {
    if (!filePath) return;
    setError(null);
    const supabase = createClient();
    // 1. Limpa o campo na campanha primeiro (idempotente, RLS protege).
    const { error: upErr } = await supabase
      .from('campaigns')
      .update({ briefing_file_url: null })
      .eq('id', campaignId);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    // 2. Tenta remover do storage (best-effort; se falhar, objeto fica órfão mas
    // a campanha já está consistente).
    await supabase.storage.from(BUCKET).remove([filePath]);
    setFilePath(null);
    onSaved();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 02 — Briefing</h3>
      <p className="text-xs text-text-secondary mb-4">
        Adicione o briefing em texto, anexe um arquivo, ou ambos. Os aprovados podem visualizar
        no dashboard.
      </p>

      <div className="space-y-4">
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
            {savedFlash && (
              <span className="text-xs text-emerald-400">Salvo ✓</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Briefing (arquivo)
          </label>
          <FileUpload
            bucket={BUCKET}
            pathPrefix={campaignId}
            accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx"
            currentPath={filePath}
            onUploaded={handleFileUploaded}
            onRemove={handleFileRemove}
            label="Anexar briefing"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {(text.trim() || filePath) && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-text-secondary mb-2">
              Envie um email a todos os aprovados avisando que o briefing está disponível.
            </p>
            <Button size="sm" onClick={handleNotifyEveryone} disabled={notifying}>
              {notifying ? 'Enviando...' : notifiedFlash ? 'Emails enviados ✓' : 'Notificar aprovados por email'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
