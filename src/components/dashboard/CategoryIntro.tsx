import Image from 'next/image';
import type { ReactNode } from 'react';
import type { CampaignCategory } from '@/types';
import { CAMPAIGN_CATEGORIES } from '@/lib/campaign-categories';

/**
 * Hero de apresentação de uma categoria, exibido enquanto ela não tem nenhuma
 * campanha. É assim que o Reviews foi lançado e é assim que o Radar nasce.
 *
 * Generalização do ReviewsIntro: mesmo markup, com os literais de cor vindos do
 * tema da categoria.
 */

export interface CategoryIntroStep {
  title: string;
  desc: string;
  /** Conteúdo interno do <svg> (paths, circles...). */
  icon: ReactNode;
}

interface CategoryIntroProps {
  category: CampaignCategory;
  eyebrow?: string;
  logo: { src: string; alt: string; width: number; height: number };
  /** Parágrafos como ReactNode para preservar <strong> no meio do texto. */
  paragraphs: ReactNode[];
  steps: CategoryIntroStep[];
  statusLabel: string;
}

export default function CategoryIntro({
  category,
  eyebrow = 'Nova categoria',
  logo,
  paragraphs,
  steps,
  statusLabel,
}: CategoryIntroProps) {
  const t = CAMPAIGN_CATEGORIES[category].theme;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-surface ${t.introShell}`}>
      {/* Brilho de fundo na cor da categoria */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${t.glowVar} 0%, transparent 70%)`,
          opacity: 0.25,
        }}
      />

      <div className="relative px-6 py-12 sm:px-10 sm:py-14 text-center">
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border mb-6 ${t.pill}`}
        >
          {eyebrow}
        </span>

        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          priority
          className={`mx-auto mb-6 h-auto w-full max-w-md ${t.logoGlow}`}
        />

        <div className="max-w-2xl mx-auto space-y-4 text-text-secondary leading-relaxed">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Como funciona — passos */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`relative rounded-2xl border border-border bg-background/60 p-5 transition-colors ${t.stepHover}`}
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.stepIcon}`}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {step.icon}
                </svg>
              </div>
              <span className={`absolute right-4 top-4 text-2xl font-bold ${t.stepNumber}`}>
                {i + 1}
              </span>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Selo de status */}
        <div className={`mt-10 inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 ${t.pill}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${t.dot}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${t.dot}`} />
          </span>
          <span className="text-sm font-semibold">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
