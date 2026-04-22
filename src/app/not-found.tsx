import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">404</h1>
        <p className="text-lg font-semibold mb-2">Página não encontrada</p>
        <p className="text-sm text-text-secondary mb-6">
          O link pode estar quebrado ou a página foi movida.
        </p>
        <Link href="/">
          <Button>Voltar para o início</Button>
        </Link>
      </div>
    </div>
  );
}
