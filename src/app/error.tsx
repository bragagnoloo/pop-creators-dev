'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
        <p className="text-sm text-text-secondary mb-6">
          Tivemos um problema inesperado. Tente novamente — se persistir, nos avise.
        </p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
