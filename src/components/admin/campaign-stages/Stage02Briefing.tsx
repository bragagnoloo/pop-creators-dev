'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import { createClient } from '@/lib/supabase/client';
import * as briefingsService from '@/services/briefings';

export interface BriefingParticipant {
  userId: string;
  fullName: string | null;
  email: string | null;
}

interface Props {
  campaignId: string;
  campaignTitle: string;
  initialBriefing: string | null;
  initialBriefingFileUrl: string | null;
  deliveryCount: number;
  participants: BriefingParticipant[];
  onSaved: () => void;
}

const BUCKET = 'campaign-briefings';

type SaveResult = { ok: boolean; error?: string };

/**
 * Uma opção (variação) de briefing: texto + arquivo, com remover opção.
 * Gerencia o próprio estado; persiste via handlers.
 */
function OptionBlock({
  label,
  initialText,
  initialFilePath,
  pathPrefix,
  removable,
  onSaveText,
  onUploadFile,
  onRemoveFile,
  onRemoveOption,
}: {
  label: string;
  initialText: string | null;
  initialFilePath: string | null;
  pathPrefix: string;
  removable: boolean;
  onSaveText: (text: string) => Promise<SaveResult>;
  onUploadFile: (path: string) => Promise<SaveResult>;
  onRemoveFile: () => Promise<SaveResult>;
  onRemoveOption: () => Promise<SaveResult>;
}) {
  const [text, setText] = useState(initialText ?? '');
  const [filePath, setFilePath] = useState<string | null>(initialFilePath);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveText = async () => {
    setSaving(true);
    setError(null);
    const res = await onSaveText(text);
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'Falha ao salvar.');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleFileUploaded = async (path: string) => {
    setError(null);
    const res = await onUploadFile(path);
    if (!res.ok) return setError(res.error ?? 'Falha ao salvar o arquivo.');
    setFilePath(path);
  };

  const handleFileRemove = async () => {
    if (!filePath) return;
    setError(null);
    const res = await onRemoveFile();
    if (!res.ok) return setError(res.error ?? 'Falha ao remover o arquivo.');
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([filePath]);
    setFilePath(null);
  };

  const handleRemoveOption = async () => {
    setRemoving(true);
    setError(null);
    const res = await onRemoveOption();
    setRemoving(false);
    if (!res.ok) return setError(res.error ?? 'Falha ao remover a opção.');
  };

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-popline-light">{label}</p>
        {removable && (
          <button
            type="button"
            onClick={handleRemoveOption}
            disabled={removing}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {removing ? 'Removendo...' : 'Remover opção'}
          </button>
        )}
      </div>

      <div>
        <Textarea
          label="Briefing (texto)"
          placeholder="Cole aqui o briefing detalhado, requisitos, referências..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
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

/** Um entregável: lista de opções + botão adicionar + resumo das escolhas. */
function DeliverableBriefing({
  campaignId,
  index,
  showHeader,
  seedText,
  initialOptions,
  participants,
  choicesForIndex,
  onSaved,
}: {
  campaignId: string;
  index: number;
  showHeader: boolean;
  seedText: string | null;
  initialOptions: briefingsService.BriefingOption[];
  participants: BriefingParticipant[];
  choicesForIndex: Map<string, number>;
  onSaved: () => void;
}) {
  const [optionNumbers, setOptionNumbers] = useState<number[]>(
    initialOptions.length ? initialOptions.map(o => o.optionNumber) : [1],
  );
  const optionByNumber = useMemo(
    () => new Map(initialOptions.map(o => [o.optionNumber, o])),
    [initialOptions],
  );

  const addOption = () => {
    setOptionNumbers(prev => [...prev, (prev.length ? Math.max(...prev) : 0) + 1]);
  };

  const positionOf = (n: number) => optionNumbers.indexOf(n) + 1;

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      {showHeader && <p className="text-sm font-semibold">Entregável {index}</p>}

      {optionNumbers.map(n => {
        const existing = optionByNumber.get(n);
        const seed = existing?.briefing ?? (index === 1 && n === 1 ? seedText : null);
        return (
          <OptionBlock
            key={n}
            label={`Opção ${positionOf(n)}`}
            initialText={seed}
            initialFilePath={existing?.briefingFileUrl ?? null}
            pathPrefix={`${campaignId}/${index}/${n}`}
            removable={optionNumbers.length > 1}
            onSaveText={async text => {
              const r = await briefingsService.upsertOptionText(campaignId, index, n, text);
              if (r.ok) onSaved();
              return r;
            }}
            onUploadFile={async path => {
              const r = await briefingsService.setOptionFile(campaignId, index, n, path);
              if (r.ok) onSaved();
              return r;
            }}
            onRemoveFile={async () => {
              const r = await briefingsService.clearOptionFile(campaignId, index, n);
              if (r.ok) onSaved();
              return r;
            }}
            onRemoveOption={async () => {
              const r = await briefingsService.removeOption(campaignId, index, n);
              if (r.ok) {
                setOptionNumbers(prev => prev.filter(x => x !== n));
                onSaved();
              }
              return r;
            }}
          />
        );
      })}

      <Button size="sm" variant="ghost" onClick={addOption}>
        + Adicionar opção
      </Button>

      {participants.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            Escolhas dos criadores
          </p>
          <div className="space-y-1">
            {participants.map(p => {
              const chosen = choicesForIndex.get(p.userId);
              const pos = chosen != null ? positionOf(chosen) : 0;
              const label =
                chosen == null
                  ? 'não escolheu'
                  : pos > 0
                    ? `Opção ${pos}`
                    : 'opção removida';
              return (
                <div key={p.userId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-primary">
                    {p.fullName || p.email || 'Sem nome'}
                  </span>
                  <span
                    className={
                      chosen == null ? 'text-text-secondary italic' : 'text-popline-light font-medium'
                    }
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Stage02Briefing({
  campaignId,
  campaignTitle,
  initialBriefing,
  deliveryCount,
  participants,
  onSaved,
}: Props) {
  const multi = (deliveryCount ?? 1) > 1;
  const count = Math.max(1, deliveryCount ?? 1);

  const [options, setOptions] = useState<briefingsService.BriefingOption[]>([]);
  const [choices, setChoices] = useState<briefingsService.BriefingChoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifiedFlash, setNotifiedFlash] = useState(false);

  useLoadOnMount(async () => {
    const [opts, chs] = await Promise.all([
      briefingsService.getBriefingOptions(campaignId),
      briefingsService.getAllChoices(campaignId),
    ]);
    setOptions(opts);
    setChoices(chs);
    setLoaded(true);
  }, [campaignId]);

  const optionsByIndex = useMemo(() => {
    const m = new Map<number, briefingsService.BriefingOption[]>();
    for (const o of options) {
      const arr = m.get(o.index) ?? [];
      arr.push(o);
      m.set(o.index, arr);
    }
    return m;
  }, [options]);

  const choicesByIndex = useMemo(() => {
    const m = new Map<number, Map<string, number>>();
    for (const c of choices) {
      const inner = m.get(c.index) ?? new Map<string, number>();
      inner.set(c.userId, c.optionNumber);
      m.set(c.index, inner);
    }
    return m;
  }, [choices]);

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
          // Email genérico (aponta pro painel da campanha) — o conteúdo por
          // entregável/opção fica no dashboard.
          briefingText: null,
          briefingFileUrl: null,
        },
      }),
    }).catch(() => {});
    setNotifying(false);
    setNotifiedFlash(true);
    setTimeout(() => setNotifiedFlash(false), 3000);
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 02 — Briefing</h3>
      <p className="text-xs text-text-secondary mb-4">
        {multi
          ? `Esta campanha tem ${deliveryCount} entregáveis. Para cada entregável, adicione uma ou mais opções de briefing. O criador escolhe qual variação seguir no dashboard.`
          : 'Adicione uma ou mais opções de briefing (texto e/ou arquivo). O criador escolhe qual variação seguir no dashboard.'}
      </p>

      {!loaded ? (
        <p className="text-sm text-text-secondary italic">Carregando briefings…</p>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: count }, (_, i) => i + 1).map(idx => (
            <DeliverableBriefing
              key={idx}
              campaignId={campaignId}
              index={idx}
              showHeader={multi}
              seedText={initialBriefing}
              initialOptions={optionsByIndex.get(idx) ?? []}
              participants={participants}
              choicesForIndex={choicesByIndex.get(idx) ?? new Map()}
              onSaved={onSaved}
            />
          ))}

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
      )}
    </Card>
  );
}
