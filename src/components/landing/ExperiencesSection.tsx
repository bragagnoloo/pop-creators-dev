'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/lib/constants';

type Experiencia = {
  id: string;
  /** Nome da experiência (ou da campanha, quando houver uma por trás). */
  marca: string;
  quando: string;
  /** Só existe quando a experiência veio de uma campanha da plataforma. */
  logoUrl?: string;
  descricao: string[];
  destaque: string;
  videoUrl?: string;
  posterUrl?: string;
};

const STORAGE = 'https://xduxtovqwebteqhrffgh.supabase.co/storage/v1/object/public';
const LOGOS = `${STORAGE}/campaign-logos`;
// MP4 verticais na raiz do bucket público `videos`. Se um arquivo faltar ou
// der 404, o mockup cai na arte da campanha, então a dobra nunca quebra.
const VIDEOS = `${STORAGE}/videos`;

const EXPERIENCIAS: Experiencia[] = [
  {
    id: 'doce-maravilha',
    marca: 'Festival Doce Maravilha',
    quando: 'Rio de Janeiro · 2026',
    logoUrl: `${LOGOS}/logo-1785289594948-ak2nfr.jpeg`,
    descricao: [
      'Um festival que celebra a música e a cultura brasileira reunindo gerações no mesmo palco, com creators circulando por ele de credencial, não de ingresso.',
      'A experiência foi viver o Doce Maravilha por dentro e transformar isso em conteúdo enquanto a festa ainda acontecia.',
    ],
    destaque: 'Credencial, acesso e cachê garantido.',
    videoUrl: `${VIDEOS}/doce-maravilha.mp4`,
    posterUrl: `${LOGOS}/logo-1785289594948-ak2nfr.jpeg`,
  },
  {
    id: 'fragmentos',
    marca: 'Fragmentos: A Experiência',
    quando: 'Ludmilla · 23 de julho de 2026',
    logoUrl: `${LOGOS}/logo-1783022153726-bpcd1c.jpeg`,
    descricao: [
      'Ludmilla transformou o álbum Fragmentos em um projeto audiovisual inédito: intimista, sensorial e imersivo, feito para poucas pessoas de cada vez.',
      'Nossos creators entraram nessa sala e contaram de dentro o que quase ninguém pôde ver.',
    ],
    destaque: 'Acesso que ingresso nenhum comprava.',
    videoUrl: `${VIDEOS}/fragmentos.mp4`,
    posterUrl: `${LOGOS}/logo-1783022153726-bpcd1c.jpeg`,
  },
  {
    id: 'harry-styles',
    // Experiência avulsa: não passou por campanha, por isso não tem logo.
    marca: 'Harry Styles',
    quando: 'São Paulo',
    descricao: [
      'Um dos maiores shows internacionais a passar por São Paulo, daqueles em que cada pessoa da plateia vira um cinegrafista.',
      'Essa não saiu de uma campanha aberta na plataforma. Foi uma daquelas oportunidades que aparecem de última hora e vão para quem já está por perto, com a câmera na mão.',
    ],
    destaque: 'Nem toda oportunidade nasce de um briefing.',
    videoUrl: `${VIDEOS}/harry-styles.mp4`,
  },
  {
    id: 'inverno-rio',
    marca: 'Festival de Inverno Rio',
    quando: '24 de julho a 2 de agosto de 2026',
    logoUrl: `${LOGOS}/logo-1782576102346-d6rpo7.jpeg`,
    descricao: [
      'Dez dias de festival reunindo pop, MPB, rock, rap, samba e pagode, em um dos maiores encontros da música brasileira.',
      'Uma programação tão plural só se traduz com olhares plurais: creators de perfis diferentes cobrindo o que uma lente só não daria conta.',
    ],
    destaque: 'Dez dias de festival, dez olhares diferentes.',
    videoUrl: `${VIDEOS}/inverno-rio.mp4`,
    posterUrl: `${LOGOS}/logo-1782576102346-d6rpo7.jpeg`,
  },
  {
    id: 'seraqabre',
    marca: 'Festival SeráQAbre?',
    quando: 'Village Superbet · 12 de junho de 2026',
    logoUrl: `${LOGOS}/logo-1779561852666-sg8qz7.png`,
    descricao: [
      'Edição histórica no Village Superbet, dentro do Jockey Club Brasileiro: Pabllo Vittar e Luísa Sonza na véspera do primeiro jogo do Brasil, que ainda caiu no Dia dos Namorados.',
      'Data dessas não se repete. Nossos creators estavam no meio da festa para transformar o irrepetível em conteúdo.',
    ],
    destaque: 'Música, cultura pop e futebol no mesmo dia.',
    videoUrl: `${VIDEOS}/seraqabre.mp4`,
    posterUrl: `${LOGOS}/logo-1779561852666-sg8qz7.png`,
  },
];

export default function ExperiencesSection() {
  const [ativa, setAtiva] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const exp = EXPERIENCIAS[ativa];

  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const proxima =
      e.key === 'ArrowRight'
        ? (ativa + 1) % EXPERIENCIAS.length
        : (ativa - 1 + EXPERIENCIAS.length) % EXPERIENCIAS.length;
    setAtiva(proxima);
    tabRefs.current[proxima]?.focus();
  };

  return (
    <section id="experiencias" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-popline-magenta/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">
            Prova real
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Algumas de nossas <span className="gradient-text">Experiências</span>
          </h2>
          <p className="text-text-secondary text-base sm:text-lg">
            Não é sobre estar em um evento. É sobre viver por dentro o que a maioria só assiste de
            longe, e sair de lá com conteúdo que ninguém mais tem.
          </p>
        </div>

        {/* Abas */}
        <div
          role="tablist"
          aria-label="Experiências"
          onKeyDown={handleTabKey}
          className="flex gap-2 overflow-x-auto snap-x pb-2 mb-8 justify-start lg:flex-wrap lg:overflow-visible lg:justify-center"
          style={{ scrollbarWidth: 'none' }}
        >
          {EXPERIENCIAS.map((item, i) => {
            const ativo = i === ativa;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`tab-${item.id}`}
                aria-selected={ativo}
                aria-controls={`painel-${item.id}`}
                tabIndex={ativo ? 0 : -1}
                onClick={() => setAtiva(i)}
                className={`snap-start shrink-0 px-4 sm:px-5 py-2.5 rounded-full text-sm transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink/50 ${
                  ativo
                    ? 'gradient-bg text-white font-semibold shadow-lg shadow-popline-pink/20'
                    : 'border border-white/10 bg-white/[0.03] text-text-secondary hover:text-text-primary hover:border-popline-pink/30'
                }`}
              >
                {item.marca}
              </button>
            );
          })}
        </div>

        {/* Card da experiência */}
        <div
          role="tabpanel"
          id={`painel-${exp.id}`}
          aria-labelledby={`tab-${exp.id}`}
          key={exp.id}
          className="glass-card glow-border rounded-3xl p-6 sm:p-10 animate-fade-in"
        >
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center">
            {/* Esquerda: descrição da experiência */}
            <div className="order-2 lg:order-none lg:col-span-7">
              <div className="flex items-center gap-4 mb-6">
                {exp.logoUrl && (
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    <Image
                      src={exp.logoUrl}
                      alt={exp.marca}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-text-primary leading-tight mb-1">
                    {exp.marca}
                  </p>
                  <p className="text-sm text-text-secondary">{exp.quando}</p>
                </div>
              </div>

              <div className="space-y-4">
                {exp.descricao.map((paragrafo, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed text-base sm:text-lg">
                    {paragrafo}
                  </p>
                ))}
                <p className="text-text-primary font-semibold leading-relaxed text-base sm:text-lg">
                  {exp.destaque}
                </p>
              </div>
            </div>

            {/* Direita: mockup, encostado à direita no desktop */}
            <div className="order-1 lg:order-none lg:col-span-5">
              <ExperienceVideo src={exp.videoUrl} poster={exp.posterUrl} marca={exp.marca} />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            {/* Mesmo tratamento da tag de novidade da dobra de Vantagens, em
                caixa normal porque aqui é uma frase e não um rótulo. */}
            <p className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-popline-purple to-popline-pink px-4 py-2 text-sm sm:text-base font-semibold text-white shadow-lg shadow-popline-purple/30">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-pulse-glow" />
              A próxima experiência pode ser a sua.
            </p>
            <Link
              href={ROUTES.REGISTER}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-12 text-base rounded-xl gradient-bg gradient-bg-hover text-white font-semibold shadow-lg shadow-popline-pink/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink/50 shrink-0"
            >
              Quero participar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceVideo({
  src,
  poster,
  marca,
}: {
  src?: string;
  poster?: string;
  marca: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);
  const [tocando, setTocando] = useState(false);
  // Arquivo ainda não subiu pro bucket: cai na arte da campanha em vez de
  // deixar um retângulo preto no mockup.
  const [falhou, setFalhou] = useState(false);
  const temVideo = Boolean(src) && !falhou;

  // Autoplay ao entrar na viewport, pausa ao sair. Só funciona com `muted` +
  // `playsInline`. Sem isso iOS e Chrome bloqueiam.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const alternarSom = () => {
    const el = videoRef.current;
    if (!el) return;
    // O unmute precisa acontecer dentro do gesto do usuário: se cair num
    // efeito, Safari/iOS ignoram e o vídeo continua mudo.
    el.muted = !el.muted;
    setMudo(el.muted);
    el.play().catch(() => {});
    // O Chrome pausa o vídeo ao desmutar algo que começou em autoplay mudo.
    // Um replay logo depois devolve o vídeo ao ar, já com som.
    if (!el.muted) {
      setTimeout(() => {
        if (el.paused) el.play().catch(() => {});
      }, 60);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px] lg:mx-0 lg:ml-auto">
      {/* Botões laterais do aparelho */}
      <div className="absolute -left-[3px] top-[18%] h-8 w-[3px] rounded-l bg-[#2a2a3a]" />
      <div className="absolute -left-[3px] top-[32%] h-12 w-[3px] rounded-l bg-[#2a2a3a]" />
      <div className="absolute -right-[3px] top-[26%] h-14 w-[3px] rounded-r bg-[#2a2a3a]" />

      <div className="relative rounded-[2.5rem] border-[7px] border-[#1a1a24] bg-[#1a1a24] shadow-2xl shadow-popline-pink/10">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-black">
          {temVideo ? (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`Conteúdo produzido na experiência ${marca}`}
              onPlay={() => setTocando(true)}
              onPause={() => setTocando(false)}
              onError={() => setFalhou(true)}
              className="h-full w-full object-cover"
            />
          ) : poster ? (
            // Arte da campanha: fundo desfocado + arte inteira por cima, para
            // não cortar o letreiro num enquadramento 9:16.
            <>
              <Image
                src={poster}
                alt=""
                aria-hidden
                fill
                sizes="300px"
                className="object-cover scale-125 blur-2xl opacity-40"
              />
              <Image src={poster} alt={marca} fill sizes="300px" className="object-contain" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-popline-magenta/25 via-surface to-background">
              <span className="text-3xl font-black gradient-text">
                {marca.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Dynamic island */}
          <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 h-5 w-20 rounded-full bg-black" />

          {/* Play: aparece quando o autoplay não rolou (bloqueio ou reduce-motion) */}
          {temVideo && !tocando && (
            <button
              type="button"
              onClick={() => videoRef.current?.play().catch(() => {})}
              aria-label="Reproduzir vídeo"
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-popline-pink/60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full gradient-bg shadow-lg shadow-popline-pink/30">
                <svg className="w-5 h-5 ml-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}

          {/* Som */}
          {temVideo && (
            <button
              type="button"
              onClick={alternarSom}
              aria-label={mudo ? 'Ativar som' : 'Desativar som'}
              className="absolute top-9 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white cursor-pointer transition-colors hover:border-popline-pink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink/50"
            >
              {mudo ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
