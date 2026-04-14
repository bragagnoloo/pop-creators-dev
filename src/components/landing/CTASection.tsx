import Link from 'next/link';
import Button from '@/components/ui/Button';
import Popline20Logo from '@/components/ui/Popline20Logo';
import { ROUTES } from '@/lib/constants';

export default function CTASection() {
  return (
    <section className="py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center">
          {/* Layered gradient background */}
          <div className="absolute inset-0 gradient-bg opacity-[0.08]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute inset-0 noise-overlay" />
          <div className="absolute inset-0 border border-popline-pink/10 rounded-3xl" />

          {/* Floating POPline 20 Anos */}
          <div className="absolute top-6 right-10 animate-float opacity-12 hidden sm:block">
            <Popline20Logo size={65} />
          </div>
          <div className="absolute bottom-6 left-10 animate-float-delay opacity-[0.08] hidden sm:block">
            <Popline20Logo size={45} />
          </div>

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Pronto para <span className="gradient-text">criar</span>?
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto mb-8 text-lg">
              Junte-se a centenas de criadores que ja estao construindo carreira
              com a POPline e a UGC+.
            </p>
            <Link href={ROUTES.REGISTER}>
              <Button size="lg" className="min-w-[220px] text-base shadow-lg shadow-popline-pink/20">
                Criar Minha Conta
              </Button>
            </Link>
            <p className="text-xs text-text-secondary mt-4">Cadastro gratuito. Sem cartao de credito.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
