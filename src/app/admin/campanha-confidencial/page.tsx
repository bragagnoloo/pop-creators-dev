'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Inscricao {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  instagram: string;
  tiktok: string;
  nacionalidade: string;
  cpf: string;
  rg: string;
  pix: string;
  endereco: string;
  cidade_estado: string;
  email: string;
  criado_em: string;
}

const COLUMNS: { key: keyof Inscricao; label: string }[] = [
  { key: 'nome_completo', label: 'Nome completo' },
  { key: 'data_nascimento', label: 'Nascimento' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'nacionalidade', label: 'Nacionalidade' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'pix', label: 'Pix' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'cidade_estado', label: 'Cidade/Estado' },
  { key: 'email', label: 'E-mail' },
  { key: 'criado_em', label: 'Enviado em' },
];

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(v: string) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString('pt-BR');
}

function fmtBirth(v: string) {
  if (!v) return '';
  // data_nascimento vem como YYYY-MM-DD; evita fuso ao formatar
  const [y, m, d] = v.split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
}

export default function AdminCampanhaConfidencialPage() {
  const { data, isLoading, mutate } = useSWR<{ data: Inscricao[] }>(
    '/api/admin/campanha-confidencial/list',
    fetcher,
  );
  const rows = data?.data ?? [];

  // Disparo de convites
  const [emailsText, setEmailsText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const parsedEmails = emailsText
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const uniqueEmails = Array.from(new Set(parsedEmails));

  function exportCSV() {
    const header = COLUMNS.map((c) => csvEscape(c.label)).join(',');
    const lines = rows.map((r) =>
      COLUMNS.map((c) => {
        if (c.key === 'criado_em') return csvEscape(fmtDate(r.criado_em));
        if (c.key === 'data_nascimento') return csvEscape(fmtBirth(r.data_nascimento));
        return csvEscape(r[c.key]);
      }).join(','),
    );
    const csv = '﻿' + [header, ...lines].join('\r\n') + '\r\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanha-confidencial-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSend() {
    if (uniqueEmails.length === 0 || sending) return;
    const ok = window.confirm(
      `Enviar o convite da Campanha Confidencial para ${uniqueEmails.length} e-mail(s)?\n\nEsta ação dispara os emails imediatamente.`,
    );
    if (!ok) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/campanha-confidencial/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: uniqueEmails }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSendResult(`Erro: ${json.error ?? 'falha no envio'}`);
      } else {
        const invalidos = (json.invalidos ?? []).length;
        setSendResult(
          `✓ ${json.enviados} convite(s) enviado(s)${invalidos ? ` · ${invalidos} inválido(s) ignorado(s)` : ''}.`,
        );
      }
    } catch {
      setSendResult('Erro inesperado ao enviar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Campanha Confidencial</h1>
          <p className="text-sm text-text-secondary mt-1">
            Inscrições do formulário <code className="text-popline-light">/campanha-confidencial</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            Atualizar
          </Button>
          <Button variant="secondary" onClick={exportCSV} disabled={rows.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Painel de disparo de convites */}
      <Card>
        <h2 className="text-lg font-semibold">Disparar convites</h2>
        <p className="text-sm text-text-secondary mt-1">
          Cole a lista de e-mails (um por linha, ou separados por vírgula/espaço). Pré-visualize o
          email antes de enviar.
        </p>
        <textarea
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          rows={6}
          placeholder={'creator1@email.com\ncreator2@email.com'}
          className="mt-4 w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-popline-pink focus:ring-1 focus:ring-popline-pink/30 transition-colors font-mono"
        />
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
          <span className="text-sm text-text-secondary">
            {uniqueEmails.length} e-mail(s) válido(s) detectado(s)
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/campanha-confidencial/preview"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                Pré-visualizar email
              </Button>
            </a>
            <Button onClick={handleSend} disabled={uniqueEmails.length === 0 || sending}>
              {sending ? 'Enviando...' : `Enviar convites (${uniqueEmails.length})`}
            </Button>
          </div>
        </div>
        {sendResult && (
          <p className="text-sm mt-3 text-text-primary">{sendResult}</p>
        )}
      </Card>

      {/* Tabela de inscrições */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-text-secondary">
            {isLoading ? 'Carregando…' : `${rows.length} inscrição(ões)`}
          </p>
        </div>
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="text-left font-medium text-text-secondary px-3 py-3 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-text-secondary">
                    Nenhuma inscrição ainda.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface/50">
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-3 py-3 whitespace-nowrap text-text-primary">
                      {c.key === 'criado_em'
                        ? fmtDate(r.criado_em)
                        : c.key === 'data_nascimento'
                          ? fmtBirth(r.data_nascimento)
                          : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
