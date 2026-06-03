/**
 * Monta link wa.me a partir de um telefone bruto (com ou sem formatação).
 * Adiciona o código do país 55 (Brasil) se não estiver presente.
 * Retorna null se o número for inválido.
 */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // 10 ou 11 dígitos = telefone BR sem DDI. 12-13 = já tem DDI.
  const withCountry = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}
