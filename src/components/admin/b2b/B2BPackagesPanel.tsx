'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import EditableCell from './EditableCell';
import { formatBRL } from '@/services/wallet';
import { parseBRLInput, summarizePackage } from '@/services/b2b-finance';
import type { B2BFinanceRow, B2BPackage, B2BPackagePatch } from '@/types';

interface Props {
  packages: B2BPackage[];
  rows: B2BFinanceRow[];
  onClose: () => void;
  onCreate: (body: B2BPackagePatch) => Promise<string | null>;
  onUpdate: (id: string, body: B2BPackagePatch) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  /** Filtra a tabela pelo pacote e fecha o painel. */
  onShow: (id: string) => void;
}

const INPUT =
  'w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary ' +
  'focus:outline-none focus:border-popline-pink transition-colors';

/**
 * Pacotes de contratação. O valor de cada campanha continua no painel da
 * campanha; aqui só se cadastra o pacote e se confere se a soma bate.
 */
export default function B2BPackagesPanel({
  packages,
  rows,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onShow,
}: Props) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [total, setTotal] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dê um nome ao pacote.');
      return;
    }
    const totalValue = total.trim() ? parseBRLInput(total) : null;
    if (total.trim() && totalValue === null) {
      setError('Valor total inválido.');
      return;
    }
    setCreating(true);
    setError(null);
    const err = await onCreate({
      name: name.trim(),
      contractingCompany: company.trim() || null,
      totalValue,
    });
    setCreating(false);
    if (err) {
      setError(err);
      return;
    }
    setName('');
    setCompany('');
    setTotal('');
  };

  const handleDelete = async (pkg: B2BPackage, count: number) => {
    const ok = window.confirm(
      `Apagar o pacote "${pkg.name}"?\n\n` +
        (count > 0
          ? `As ${count} campanha(s) dele viram avulsas e mantêm todos os valores.`
          : 'Ele não tem campanhas.')
    );
    if (!ok) return;
    const err = await onDelete(pkg.id);
    if (err) window.alert(err);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <aside className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-surface border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 z-10 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Pacotes</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Contratações com valor global. O valor de cada campanha é preenchido no
              painel dela; a soma tem que bater com o total do pacote.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl leading-none px-1 shrink-0"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-border p-3 space-y-2"
          >
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">
              Novo pacote
            </p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome (ex.: Universal – Produção de Conteúdo)"
              className={INPUT}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Contratante"
                className={INPUT}
              />
              <input
                value={total}
                onChange={e => setTotal(e.target.value)}
                placeholder="Valor total (R$)"
                inputMode="decimal"
                className={INPUT}
              />
            </div>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? 'Criando…' : 'Criar pacote'}
            </Button>
          </form>

          {packages.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-6">
              Nenhum pacote cadastrado.
            </p>
          )}

          {packages.map(pkg => {
            const s = summarizePackage(pkg, rows);
            const bate = s.difference === 0;
            return (
              <div key={pkg.id} className="rounded-xl border border-border p-3 space-y-2">
                <EditableCell
                  kind="text"
                  value={pkg.name}
                  placeholder="Nome do pacote"
                  onCommit={v =>
                    v ? onUpdate(pkg.id, { name: v as string }) : Promise.resolve('Dê um nome ao pacote.')
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <EditableCell
                    kind="text"
                    value={pkg.contractingCompany}
                    placeholder="Contratante"
                    onCommit={v => onUpdate(pkg.id, { contractingCompany: v as string | null })}
                  />
                  <EditableCell
                    kind="currency"
                    value={pkg.totalValue}
                    placeholder="Valor total"
                    onCommit={v => onUpdate(pkg.id, { totalValue: v as number | null })}
                  />
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-text-secondary">Soma das campanhas</span>
                    <span className="tabular-nums text-text-primary">
                      {formatBRL(s.campaignsTotal)}
                    </span>
                  </div>
                  {s.difference !== null && (
                    <div className="flex justify-between gap-2">
                      <span className="text-text-secondary">Conferência</span>
                      <span
                        className={`tabular-nums font-medium ${bate ? 'text-emerald-400' : 'text-amber-400'}`}
                      >
                        {bate
                          ? '✓ bate com o total'
                          : `⚠ ${s.difference > 0 ? 'faltam' : 'sobram'} ${formatBRL(Math.abs(s.difference))}`}
                      </span>
                    </div>
                  )}
                </div>

                {s.campaigns.length > 0 ? (
                  <ul className="text-[11px] text-text-secondary space-y-0.5">
                    {s.campaigns.map(c => (
                      <li key={c.campaignId} className="flex justify-between gap-2">
                        <span className="truncate">{c.title}</span>
                        <span className="tabular-nums shrink-0">
                          {c.agreedValue === null ? '—' : formatBRL(c.agreedValue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-text-secondary italic">
                    Sem campanhas. Abra uma campanha na tabela e escolha este pacote.
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  {s.campaigns.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => onShow(pkg.id)}>
                      Ver na tabela
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(pkg, s.campaigns.length)}
                  >
                    Apagar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
