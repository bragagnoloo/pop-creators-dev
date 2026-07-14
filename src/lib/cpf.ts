/**
 * Validação e formatação de CPF (Cadastro de Pessoa Física).
 * Não havia util de CPF no codebase — criado para a Campanha Confidencial.
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida um CPF pelos dígitos verificadores.
 * Aceita com ou sem máscara. Rejeita sequências repetidas (ex: 111.111.111-11).
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  const calcCheck = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheck(9) === digits[9] && calcCheck(10) === digits[10];
}

/** Formata como 000.000.000-00 progressivamente (para input mask). */
export function formatCpf(value: string): string {
  const cpf = onlyDigits(value).slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
