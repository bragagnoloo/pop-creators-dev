import { ValidationError, parseMoney, parseText } from '@/lib/b2b-validation';

export const PACKAGE_COLUMNS = 'id, name, contracting_company, total_value, notes';

/** Whitelist chave a chave do corpo de um pacote. Só as chaves presentes entram. */
export function parsePackageBody(body: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ('name' in body) {
    const name = parseText(body.name, 160, 'Nome do pacote');
    if (!name) throw new ValidationError('Dê um nome ao pacote.');
    row.name = name;
  }
  if ('contractingCompany' in body) {
    row.contracting_company = parseText(body.contractingCompany, 160, 'Contratante');
  }
  if ('totalValue' in body) {
    row.total_value = parseMoney(body.totalValue, 'Valor total', true);
  }
  if ('notes' in body) {
    row.notes = parseText(body.notes, 2000, 'Observações');
  }
  return row;
}
