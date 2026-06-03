'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getAdminRanking, type AdminRankingEntry } from '@/services/ranking';
import { useRequireTab } from '@/lib/hooks/useRequireTab';
import { PlanId } from '@/types';

type Scope = 'monthly' | 'alltime';

const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Grátis',
  monthly: 'Mensal',
  semester: 'Semestral',
  yearly: 'Anual',
};

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function yyyymm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseYyyymm(value: string): { year: number; month: number } {
  const [y, m] = value.split('-').map(Number);
  return { year: y, month: m };
}

const csvEscape = (val: string) => {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

function generateRankingCsv(entries: AdminRankingEntry[]): string {
  const headers = ['Posicao', 'Pontos', 'Nome', 'Email', 'WhatsApp', 'Estado', 'Cidade', 'Plano'];
  const lines = [headers.map(csvEscape).join(',')];
  for (const e of entries) {
    const row = [
      String(e.rank),
      String(e.totalPoints),
      e.fullName,
      e.email,
      e.whatsapp ?? '',
      e.state ?? '',
      e.city ?? '',
      PLAN_LABEL[e.plan] ?? e.plan,
    ];
    lines.push(row.map(csvEscape).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

function downloadCsv(entries: AdminRankingEntry[], filename: string) {
  const csv = generateRankingCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminRankingPage() {
  useRequireTab('ranking');
  const [scope, setScope] = useState<Scope>('alltime');
  const { year: currentYear, month: currentMonth } = currentYearMonth();
  const [yearMonth, setYearMonth] = useState<string>(yyyymm(currentYear, currentMonth));
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [entries, setEntries] = useState<AdminRankingEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch ranking whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { year, month } = parseYyyymm(yearMonth);
    getAdminRanking({
      scope,
      year:  scope === 'monthly' ? year  : undefined,
      month: scope === 'monthly' ? month : undefined,
      state: filterState || undefined,
      city:  filterCity  || undefined,
      limit: 5000,
    }).then(data => {
      if (cancelled) return;
      setEntries(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [scope, yearMonth, filterState, filterCity]);

  // Extract unique states from the returned entries
  const states = useMemo(() => {
    const set = new Set(entries.map(e => e.state).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [entries]);

  // Cities cascade from selected state (when no state filter, show all cities)
  const cities = useMemo(() => {
    const base = filterState ? entries.filter(e => e.state === filterState) : entries;
    const set = new Set(base.map(e => e.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [entries, filterState]);

  const handleStateChange = (value: string) => {
    setFilterState(value);
    setFilterCity('');
  };

  const handleExportCsv = () => {
    const filename = scope === 'monthly'
      ? `ranking-mensal-${yearMonth}-${filterState || 'todos'}.csv`
      : `ranking-geral-${filterState || 'todos'}.csv`;
    downloadCsv(entries, filename);
  };

  const selectStyle = "bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ranking</h1>

      {/* Scope toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setScope('alltime')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            scope === 'alltime'
              ? 'bg-popline-pink text-white'
              : 'bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          Geral
        </button>
        <button
          onClick={() => setScope('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            scope === 'monthly'
              ? 'bg-popline-pink text-white'
              : 'bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          Mensal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {scope === 'monthly' && (
          <input
            type="month"
            value={yearMonth}
            onChange={e => setYearMonth(e.target.value)}
            className={selectStyle}
          />
        )}
        <select value={filterState} onChange={e => handleStateChange(e.target.value)} className={selectStyle}>
          <option value="">Todos os Estados</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectStyle} disabled={!filterState}>
          <option value="">Todas as Cidades</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterState || filterCity) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterState(''); setFilterCity(''); }}>
            Limpar
          </Button>
        )}
        <span className="text-xs text-text-secondary">
          {loading ? 'Carregando...' : `${entries.length} resultado${entries.length !== 1 ? 's' : ''}`}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          disabled={loading || entries.length === 0}
          className="ml-auto"
        >
          Exportar CSV
        </Button>
      </div>

      {/* Ranking table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4 w-16">#</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Nome</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Email</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Plano</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Estado</th>
                <th className="text-left text-sm text-text-secondary font-medium px-6 py-4">Cidade</th>
                <th className="text-right text-sm text-text-secondary font-medium px-6 py-4">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.userId} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-3 text-sm font-medium">#{e.rank}</td>
                  <td className="px-6 py-3 text-sm">{e.fullName}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary">{e.email}</td>
                  <td className="px-6 py-3 text-sm">{PLAN_LABEL[e.plan] ?? e.plan}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary">{e.state || '—'}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary">{e.city || '—'}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium">{e.totalPoints.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && entries.length === 0 && (
          <p className="text-center text-text-secondary py-8">
            Nenhum usuário rankeado com os filtros selecionados.
          </p>
        )}
      </Card>
    </div>
  );
}
