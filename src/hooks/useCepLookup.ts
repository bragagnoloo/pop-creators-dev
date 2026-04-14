'use client';

import { useState, useCallback } from 'react';

interface CepResult {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setError('CEP deve ter 8 digitos.');
      return null;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setError('CEP nao encontrado.');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return {
        cep: data.cep,
        state: data.uf,
        city: data.localidade,
        neighborhood: data.bairro || '',
        street: data.logradouro || '',
      };
    } catch {
      setError('Erro ao buscar CEP.');
      setLoading(false);
      return null;
    }
  }, []);

  return { lookup, loading, error };
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
