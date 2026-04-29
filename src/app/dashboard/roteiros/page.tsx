'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import { SavedScript } from '@/types';
import * as scriptsService from '@/services/scripts';
import * as subService from '@/services/subscriptions';
import Card from '@/components/ui/Card';
import Paywall from '@/components/ui/Paywall';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import type { ScriptVariation } from '@/app/api/roteiros/generate/route';

type Mode = 'ugc' | 'personal';
type PersonalFormat = 'educativo' | 'storytime' | 'review' | 'opiniao' | 'tutorial' | 'entretenimento';
type Platform = 'reels' | 'tiktok' | 'shorts' | 'stories';
type Duration = 15 | 30 | 45 | 60;
type Objective = 'vender' | 'engajar' | 'educar' | 'divertir';
type Tone = 'casual' | 'profissional' | 'divertido' | 'emocional';

const formatLabels: Record<PersonalFormat, string> = {
  educativo: 'Educativo',
  storytime: 'Storytime',
  review: 'Review',
  opiniao: 'Opinião',
  tutorial: 'Tutorial',
  entretenimento: 'Entretenimento',
};

const platformLabels: Record<Platform, string> = {
  reels: 'Reels',
  tiktok: 'TikTok',
  shorts: 'YouTube Shorts',
  stories: 'Stories',
};
const objectiveLabels: Record<Objective, string> = {
  vender: 'Vender',
  engajar: 'Engajar',
  educar: 'Educar',
  divertir: 'Divertir',
};
const toneLabels: Record<Tone, string> = {
  casual: 'Casual',
  profissional: 'Profissional',
  divertido: 'Divertido',
  emocional: 'Emocional',
};

interface ActiveVariation {
  variation: ScriptVariation;
  refinementLevel: number;
}

export default function RoteirosPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('ugc');
  const [product, setProduct] = useState('');
  const [format, setFormat] = useState<PersonalFormat>('educativo');
  const [briefing, setBriefing] = useState('');
  const [platform, setPlatform] = useState<Platform>('reels');
  const [duration, setDuration] = useState<Duration>(30);
  const [objective, setObjective] = useState<Objective>('vender');
  const [tone, setTone] = useState<Tone>('casual');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<ActiveVariation[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const [showRefine, setShowRefine] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: savedScripts = [], mutate: mutateSaved } = useSWR(
    user ? ['scripts', user.id] : null,
    ([, uid]) => scriptsService.getUserScripts(uid)
  );

  const loadSaved = useCallback(() => { mutateSaved(); }, [mutateSaved]);

  const currentInputs = () => ({
    mode,
    product: mode === 'ugc' ? product : undefined,
    format: mode === 'personal' ? format : undefined,
    briefing,
    platform,
    duration,
    objective,
    tone,
    notes,
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && !(await subService.isPaid(user.id))) {
      setPaywallOpen(true);
      return;
    }
    setError(null);
    setLoading(true);
    setVariations([]);
    try {
      const res = await fetch('/api/roteiros/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentInputs()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar roteiro.');
      } else {
        setVariations((data.variations || []).map((v: ScriptVariation) => ({ variation: v, refinementLevel: 0 })));
        setActiveIdx(0);
      }
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (idx: number) => {
    if (!user) return;
    const item = variations[idx];
    await scriptsService.saveScript({
      userId: user.id,
      title: item.variation.title,
      inputs: currentInputs(),
      variation: item.variation,
      refinementLevel: item.refinementLevel,
    });
    loadSaved();
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && !(await subService.isPaid(user.id))) {
      setPaywallOpen(true);
      return;
    }
    const current = variations[activeIdx];
    if (!current || !refineInstruction.trim()) return;
    setRefining(activeIdx);
    setShowRefine(false);
    try {
      const res = await fetch('/api/roteiros/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variation: current.variation,
          instruction: refineInstruction,
          refinementLevel: current.refinementLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao aprimorar.');
      } else if (data.variation) {
        setVariations(prev => {
          const copy = [...prev];
          copy[activeIdx] = {
            variation: data.variation,
            refinementLevel: current.refinementLevel + 1,
          };
          return copy;
        });
      }
    } catch {
      setError('Falha de conexão.');
    } finally {
      setRefining(null);
      setRefineInstruction('');
    }
  };

  const handleDownload = (script: SavedScript) => {
    const text = scriptsService.scriptToText(script);
    const safeTitle = script.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiro-${safeTitle || 'popline'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await scriptsService.deleteScript(id);
    if (expandedId === id) setExpandedId(null);
    loadSaved();
  };

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">IA de Roteiros</h1>
        <p className="text-sm text-text-secondary mt-1">
          Gere 3 variações, aprimore com instruções e salve seus favoritos.
        </p>
      </div>

      <Card>
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Tipo de roteiro</label>
            <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl w-full">
              <ModeButton active={mode === 'ugc'} onClick={() => setMode('ugc')} label="UGC / Campanha" hint="Vídeo sobre produto ou marca" />
              <ModeButton active={mode === 'personal'} onClick={() => setMode('personal')} label="Conteúdo próprio" hint="Vídeo autoral, sem produto" />
            </div>
          </div>

          {mode === 'ugc' ? (
            <Input
              label="Produto ou marca"
              value={product}
              onChange={e => setProduct(e.target.value)}
              placeholder="Ex: Tênis esportivo XYZ, Curso de inglês ABC"
              required
            />
          ) : (
            <Select
              label="Formato"
              value={format}
              onChange={v => setFormat(v as PersonalFormat)}
              options={formatLabels}
            />
          )}
          <Textarea
            label="Tema / Briefing"
            value={briefing}
            onChange={e => setBriefing(e.target.value)}
            rows={4}
            placeholder={
              mode === 'ugc'
                ? 'Mensagem principal, ângulo, público e contexto da campanha.'
                : 'Sobre o que é o vídeo? Qual o ponto principal, o ângulo e a audiência.'
            }
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Plataforma" value={platform} onChange={v => setPlatform(v as Platform)} options={platformLabels} />
            <Select
              label="Duração"
              value={String(duration)}
              onChange={v => setDuration(Number(v) as Duration)}
              options={{ '15': '15 segundos', '30': '30 segundos', '45': '45 segundos', '60': '60 segundos' }}
            />
            <Select label="Objetivo" value={objective} onChange={v => setObjective(v as Objective)} options={objectiveLabels} />
            <Select label="Tom" value={tone} onChange={v => setTone(v as Tone)} options={toneLabels} />
          </div>
          <Textarea
            label="Observações adicionais (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Frase obrigatória, hashtag específica, referência visual, etc."
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Gerando...' : 'Gerar roteiros'}
          </Button>
        </form>
      </Card>

      {loading && (
        <Card>
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Roteirizando...</span>
          </div>
        </Card>
      )}

      {variations.length > 0 && (
        <Card>
          <div className="flex gap-2 mb-5 border-b border-border overflow-x-auto">
            {variations.map((v, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeIdx === i
                    ? 'border-popline-pink text-white'
                    : 'border-transparent text-text-secondary hover:text-white'
                }`}
              >
                Variação {i + 1}
                {v.refinementLevel > 0 && (
                  <span className="ml-2 text-xs text-popline-pink">+{v.refinementLevel}</span>
                )}
              </button>
            ))}
          </div>

          <ScriptView
            variation={variations[activeIdx].variation}
            refinementLevel={variations[activeIdx].refinementLevel}
            loading={refining === activeIdx}
            onSave={() => handleSave(activeIdx)}
            onRefine={() => {
              setRefineInstruction('');
              setShowRefine(true);
            }}
          />
        </Card>
      )}

      {/* Saved scripts */}
      <div>
        <h2 className="text-xl font-bold mb-4">Meus roteiros salvos</h2>
        {savedScripts.length === 0 ? (
          <Card>
            <p className="text-center text-text-secondary text-sm py-4">
              Nenhum roteiro salvo ainda. Gere um e clique em &quot;Salvar roteiro&quot;.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedScripts.map(script => (
              <SavedScriptBlock
                key={script.id}
                script={script}
                open={expandedId === script.id}
                onToggle={() => setExpandedId(prev => (prev === script.id ? null : script.id))}
                onDownload={() => handleDownload(script)}
                onDelete={() => handleDelete(script.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="IA de Roteiros"
        description="Para gerar e aprimorar roteiros você precisa ter um plano ativo."
      />

      {/* Refine modal */}
      {showRefine && (
        <Modal isOpen onClose={() => setShowRefine(false)} title="Aprimorar roteiro">
          <form onSubmit={handleRefine} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Descreva o que você quer mudar ou adicionar. A IA vai reescrever o roteiro mantendo a estrutura.
            </p>
            <Textarea
              label="Instrução de aprimoramento"
              value={refineInstruction}
              onChange={e => setRefineInstruction(e.target.value)}
              rows={4}
              placeholder="Ex: Deixe o hook mais impactante, foque em dor emocional, adicione prova social..."
              required
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRefine(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Aprimorar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-colors ${
        active ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className={`text-xs ${active ? 'text-white/80' : 'text-text-secondary'}`}>{hint}</p>
    </button>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-text-secondary font-medium">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-popline-pink transition-colors"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScriptView({
  variation,
  refinementLevel,
  loading,
  onSave,
  onRefine,
}: {
  variation: ScriptVariation;
  refinementLevel: number;
  loading: boolean;
  onSave: () => void;
  onRefine: () => void;
}) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-5 relative">
      {loading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Aprimorando...</span>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{variation.title}</h3>
            {refinementLevel > 0 && (
              <Badge variant="pink">Aprimorado {refinementLevel}x</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onRefine}>
            Aprimorar
          </Button>
          <Button size="sm" onClick={handleSave}>
            {saved ? 'Salvo ✓' : 'Salvar roteiro'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {variation.beats.map((beat, i) => (
          <div key={i} className="p-4 rounded-xl bg-background border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="pink">{beat.label}</Badge>
              <span className="text-xs text-text-secondary font-mono">{beat.time}</span>
            </div>
            <p className="text-sm whitespace-pre-line">{beat.content}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-background border border-border">
        <p className="text-xs text-text-secondary font-medium mb-1">Legenda sugerida</p>
        <p className="text-sm whitespace-pre-line">{variation.caption}</p>
      </div>

      <div className="p-4 rounded-xl bg-background border border-border">
        <p className="text-xs text-text-secondary font-medium mb-2">Hashtags</p>
        <div className="flex flex-wrap gap-1.5">
          {variation.hashtags.map((h, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-md bg-popline-pink/10 text-popline-pink">
              {h.startsWith('#') ? h : `#${h}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedScriptBlock({
  script,
  open,
  onToggle,
  onDownload,
  onDelete,
}: {
  script: SavedScript;
  open: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold truncate">{script.title}</h3>
            {script.refinementLevel > 0 && (
              <Badge variant="pink">Aprimorado {script.refinementLevel}x</Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary truncate">
            {script.inputs.mode === 'personal'
              ? `Próprio · ${script.inputs.format}`
              : `UGC · ${script.inputs.product}`}
            {' · '}
            {script.inputs.platform} · {script.inputs.duration}s ·{' '}
            {new Date(script.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
            {script.variation.beats.map((beat, i) => (
              <div key={i} className="p-3 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="pink">{beat.label}</Badge>
                  <span className="text-xs text-text-secondary font-mono">{beat.time}</span>
                </div>
                <p className="text-sm whitespace-pre-line">{beat.content}</p>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-background border border-border">
              <p className="text-xs text-text-secondary font-medium mb-1">Legenda</p>
              <p className="text-sm whitespace-pre-line">{script.variation.caption}</p>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <p className="text-xs text-text-secondary font-medium mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {script.variation.hashtags.map((h, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-md bg-popline-pink/10 text-popline-pink">
                    {h.startsWith('#') ? h : `#${h}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={onDownload}>
                Baixar .txt
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
