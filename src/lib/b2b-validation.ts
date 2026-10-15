import { isDateISO } from '@/lib/date-br';

/**
 * Validação dos corpos das rotas /api/admin/b2b/*. Compartilhado entre o
 * financeiro por campanha e os pacotes para as regras não divergirem.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_MONEY = 99_999_999.99;

export class ValidationError extends Error {}

export function parseText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new ValidationError(`${label} inválido.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new ValidationError(`${label} deve ter no máximo ${max} caracteres.`);
  }
  return trimmed;
}

export function parseMoney(value: unknown, label: string, nullable: boolean): number | null {
  if (value === null || value === undefined || value === '') {
    return nullable ? null : 0;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(`${label} inválido.`);
  if (n < 0) throw new ValidationError(`${label} não pode ser negativo.`);
  if (n > MAX_MONEY) throw new ValidationError(`${label} excede o limite permitido.`);
  return Math.round(n * 100) / 100;
}

export function parseDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !isDateISO(value)) {
    throw new ValidationError(`${label} deve ser uma data válida (AAAA-MM-DD).`);
  }
  return value;
}

export function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${label} inválido.`);
  }
  return value as T;
}
