import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

// `promo` indica que a faixa da Black Friday está na navbar fixa: o hero
// desce a mesma altura (faixa h-10/sm:h-11 + navbar h-16) para a arte
// começar logo abaixo do cabeçalho, sem ficar escondida atrás dele.
export default function HeroSection({ promo = false }: { promo?: boolean }) {
  return (
    <section className={`relative overflow-x-clip bg-background flex flex-col min-h-svh ${promo ? 'pt-[104px] sm:pt-[108px]' : 'pt-16'}`}>
      {/* A dobra ocupa a tela inteira e a arte preenche toda a área abaixo do
          cabeçalho (object-cover). Em telas mais largas que a arte, ela é
          recortada nas laterais; a âncora em 78% mantém a creator. No mobile
          a arte fica atrás do texto, então um véu escuro garante a leitura. */}
      <div className="relative flex flex-1 items-center">
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-black/60 lg:bg-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Conteúdo: z-10, ocupa a metade esquerda no desktop (a direita é da arte) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-12">
      <div className="text-center lg:w-[60%]">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-3 mb-6 sm:mb-8">
          <span className="h-px w-6 bg-popline-pink" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-popline-pink">
            Plataforma para Creators
          </span>
          <span className="h-px w-6 bg-popline-pink" />
        </div>

        {/* Headline */}
        <h1 className="font-black leading-[1.05] tracking-tight mb-6 sm:mb-8">
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            Crie conteúdo para o
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-popline-pink">
            maior ecossistema
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            sobre música e
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400 }}>
              cultura pop
            </em>
            {' '}do Brasil.
          </span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-xl text-white/85 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          Campanhas com cachê, aulas com experts e IA de roteiros.
          Tudo que você precisa para monetizar sua criatividade.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link href={ROUTES.REGISTER}>
            <Button size="lg" className="text-base min-w-[200px]">Começar agora</Button>
          </Link>
          <a href="#planos">
            <Button variant="secondary" size="lg" className="text-base min-w-[200px]">Ver planos</Button>
          </a>
        </div>

      </div>
      </div>
      </div>
    </section>
  );
}
