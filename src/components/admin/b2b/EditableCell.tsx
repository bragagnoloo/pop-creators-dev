'use client';

import { useEffect, useRef, useState } from 'react';
import { formatBRL } from '@/services/wallet';
import { parseBRLInput, formatBRLInput } from '@/services/b2b-finance';

export type EditableKind = 'text' | 'currency' | 'date' | 'percent' | 'integer';

interface EditableCellProps {
  kind: EditableKind;
  /** Valor atual vindo do servidor. */
  value: string | number | null;
  /** Salva. Devolve mensagem de erro em caso de falha. */
  onCommit: (value: string | number | null) => Promise<string | null>;
  placeholder?: string;
  min?: string;
  className?: string;
  title?: string;
  /** Conteúdo extra abaixo do campo (ex: "40% · falta R$ 6.000,00"). */
  hint?: React.ReactNode;
}

const BASE_INPUT =
  'w-full bg-background border rounded-lg px-2 py-1.5 text-sm text-text-primary ' +
  'focus:outline-none focus:border-popline-pink transition-colors';

function toDraft(kind: EditableKind, value: string | number | null): string {
  if (value === null || value === undefined) return '';
  if (kind === 'currency') return formatBRLInput(Number(value));
  return String(value);
}

/**
 * Célula com commit no blur.
 *
 * Debounce foi descartado de propósito: dois PATCH da mesma célula em voo
 * geram corrida e o último a responder vence com um draft velho. Botão de
 * salvar por célula seria inviável com ~8 campos editáveis por linha.
 */
export default function EditableCell({
  kind,
  value,
  onCommit,
  placeholder,
  min,
  className = '',
  title,
  hint,
}: EditableCellProps) {
  const [draft, setDraft] = useState(() => toDraft(kind, value));
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Re-semeia o draft quando o valor do servidor muda — padrão oficial de
  // "ajustar estado durante o render" (setState no corpo do render, sem effect):
  // evita o render extra pós-paint e não dispara a regra set-state-in-effect.
  // O guard de foco impede sobrescrever o que o admin está digitando.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue && !focused) {
    setSyncedValue(value);
    setDraft(toDraft(kind, value));
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const parse = (): string | number | null => {
    const raw = draft.trim();
    if (!raw) return null;
    if (kind === 'currency') return parseBRLInput(raw);
    if (kind === 'percent') {
      const n = Number(raw.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    if (kind === 'integer') {
      const n = Number(raw);
      return Number.isInteger(n) && n >= 0 ? n : null;
    }
    return raw;
  };

  const commit = async () => {
    if (inFlight.current) return;
    const parsed = parse();
    const current = value ?? null;
    const numeric = kind === 'currency' || kind === 'percent' || kind === 'integer';
    const normalizedCurrent =
      numeric && current !== null ? Number(current) : current;

    if (parsed === normalizedCurrent) return;

    inFlight.current = true;
    setSaving(true);
    setError(null);
    const err = await onCommit(parsed);
    inFlight.current = false;
    setSaving(false);

    if (err) {
      setError(err);
      setFlash('err');
      setDraft(toDraft(kind, value));
    } else {
      setFlash('ok');
    }
  };

  const ring =
    flash === 'ok'
      ? 'ring-1 ring-emerald-500/60 border-emerald-500/40'
      : flash === 'err'
        ? 'ring-1 ring-red-500/60 border-red-500/40'
        : 'border-border';

  // Moeda desfocada mostra formatado; focada mostra o número cru para editar.
  const displayValue =
    kind === 'currency' && !focused && value !== null && value !== undefined
      ? formatBRL(Number(value))
      : draft;

  const inputType =
    kind === 'date' ? 'date' : kind === 'percent' || kind === 'integer' ? 'number' : 'text';

  return (
    <div className={className}>
      <div className="relative">
        <input
          type={inputType}
          value={displayValue}
          min={kind === 'percent' || kind === 'integer' ? 0 : min}
          max={kind === 'percent' ? 100 : undefined}
          step={kind === 'percent' ? 0.01 : kind === 'integer' ? 1 : undefined}
          placeholder={placeholder}
          disabled={saving}
          title={error ?? title}
          onFocus={() => {
            setFocused(true);
            setDraft(toDraft(kind, value));
          }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            void commit();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setDraft(toDraft(kind, value));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`${BASE_INPUT} ${ring} ${saving ? 'opacity-60' : ''} ${
            kind === 'percent' ? 'pr-6' : ''
          }`}
        />
        {kind === 'percent' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none">
            %
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-0.5 text-[10px] text-red-400 leading-tight">{error}</p>
      ) : (
        hint
      )}
    </div>
  );
}
