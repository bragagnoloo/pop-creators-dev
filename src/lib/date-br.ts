/**
 * Helpers de data no fuso de Brasília (America/Sao_Paulo).
 *
 * Duas armadilhas que este módulo existe para evitar:
 *
 * 1. `new Date('2026-08-05')` é interpretado como meia-noite **UTC**. Formatado
 *    em BRT (UTC-3) vira 04/08 — um dia a menos. Por isso valores que já são
 *    date-only ('YYYY-MM-DD') são formatados por manipulação de string, sem
 *    passar por `Date`.
 *
 * 2. Calcular "hoje" com `new Date().getFullYear()/getMonth()/getDate()` usa o
 *    fuso **do dispositivo**. Num notebook configurado em UTC (ou em viagem) o
 *    dia vira errado. `todayBR()` usa Intl com timeZone explícito.
 */

export const BR_TZ = 'America/Sao_Paulo';

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True se o valor é uma data 'YYYY-MM-DD' válida (rejeita 2026-02-31). */
export function isDateISO(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ISO_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/** Hoje em Brasília como 'YYYY-MM-DD'. `en-CA` já emite nesse formato. */
export function todayBR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Formata para 'DD/MM/AAAA'. Aceita tanto date-only ('YYYY-MM-DD', vindo de uma
 * coluna `date`) quanto timestamptz. Devolve '—' para nulo/inválido.
 */
export function formatBRDate(value: string | null | undefined): string {
  if (!value) return '—';
  if (DATE_ISO_RE.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { timeZone: BR_TZ });
}

/** Formata timestamptz como 'DD/MM/AAAA HH:mm' no fuso de Brasília. */
export function formatBRDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    timeZone: BR_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Soma dias a uma data 'YYYY-MM-DD'. Aritmética civil pura, sem fuso. */
export function addDaysISO(iso: string, days: number): string {
  if (!isDateISO(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Dias entre a data informada e hoje em Brasília (positivo = no futuro).
 * Usa Date.UTC nos dois lados, então é imune a horário de verão.
 */
export function diffDaysFromTodayBR(iso: string | null | undefined): number | null {
  if (!iso || !isDateISO(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = todayBR().split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(ty, tm - 1, td);
  return Math.round((target - today) / 86_400_000);
}
