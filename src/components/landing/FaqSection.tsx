'use client';

import { useState } from 'react';

// Respostas conferidas contra o produto: PLANS em src/services/subscriptions.ts,
// request_withdrawal em supabase/migrations/0004_security_functions.sql e o
// aviso de prazo em src/app/dashboard/carteira/page.tsx.
const PERGUNTAS = [
  {
    q: 'Preciso pagar alguma coisa para criar minha conta?',
    a: 'Não. O cadastro é gratuito e leva poucos minutos. Você cria o perfil, conecta suas redes e já consegue navegar pela plataforma e ver as campanhas abertas. A assinatura só entra quando você quiser se candidatar.',
  },
  {
    q: 'Preciso assinar para me candidatar às campanhas?',
    a: 'Sim. A conta gratuita é de visualização: dá para explorar a plataforma e acompanhar o que está rolando. Para se candidatar às campanhas, assistir às aulas com experts e usar a IA de roteiros, é preciso ter um plano ativo.',
  },
  {
    q: 'Quanto custa e como eu pago?',
    a: 'São três planos: Mensal por R$ 49,90, Semestral por R$ 239,40 (equivale a R$ 39,90 por mês) e Anual por R$ 358,80 (equivale a R$ 29,90 por mês). O pagamento é via PIX ou cartão de crédito, no checkout seguro da Hotmart.',
  },
  {
    q: 'Assinar garante que eu seja selecionado nas campanhas?',
    a: 'Não. A seleção de cada campanha é feita pela marca e pela nossa curadoria, a partir do briefing. O que o plano faz é aumentar sua prioridade na fila: o Semestral dá 2x mais prioridade e o Anual 5x, além de liberar oportunidades exclusivas. Prioridade maior significa mais visibilidade na seleção, não vaga garantida.',
  },
  {
    q: 'Como e quando eu recebo o cachê?',
    a: 'A contagem começa quando a campanha é encerrada e todos os requisitos do briefing estão entregues. A partir daí são 60 dias corridos até a liberação do cachê. Liberado, o valor fica na sua carteira e você solicita o saque para a sua chave PIX na hora que quiser. O pagamento do saque sai em até 48h após a solicitação.',
  },
  {
    q: 'Existe valor mínimo para sacar?',
    a: 'Não existe valor mínimo. Você pode sacar qualquer quantia disponível na carteira. O único requisito é ter uma chave PIX cadastrada no seu perfil antes de pedir o saque, e ela precisa estar no seu nome.',
  },
  {
    q: 'Preciso ter um número mínimo de seguidores?',
    // TODO(confirmar): a plataforma não impõe mínimo por código. Se a curadoria
    // usa algum corte na prática, ajustar esta resposta.
    a: 'Não existe um número mínimo de seguidores para participar. O que pesa na seleção é a qualidade do seu conteúdo e o quanto o seu perfil combina com o briefing daquela campanha. Já tivemos campanhas escaladas justamente com creators de audiência pequena, porque o que a marca buscava era conteúdo genuíno.',
  },
  {
    q: 'Posso me candidatar a quantas campanhas eu quiser?',
    a: 'Sim. As candidaturas são ilimitadas em todos os planos pagos. Você pode se inscrever em todas as campanhas abertas que fizerem sentido para o seu perfil, sem limite mensal.',
  },
  {
    q: 'As campanhas são todas presenciais?',
    a: 'Não. Tem de tudo: ativações presenciais em festivais e shows, que costumam ser no Rio e em São Paulo, e campanhas que você produz de onde estiver, como os reviews de álbuns, EPs e singles. Cada campanha deixa claro no briefing o formato, a entrega e o cachê antes de você se candidatar.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Pode. Não existe fidelidade nem multa: você cancela a assinatura pelo próprio painel da Hotmart e não é cobrado na renovação seguinte. Seu acesso continua valendo até o fim do período que você já pagou.',
  },
];

export default function FaqSection() {
  const [aberta, setAberta] = useState<number | null>(0);

  // Dados estruturados: habilita o resultado rico de FAQ na busca do Google.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PERGUNTAS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <section id="faq" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-popline-magenta/5 rounded-full blur-[120px] pointer-events-none" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">
            Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Perguntas <span className="gradient-text">frequentes</span>
          </h2>
          <p className="text-text-secondary text-lg">
            O que todo creator quer saber antes de entrar.
          </p>
        </div>

        <div className="space-y-3">
          {PERGUNTAS.map((item, i) => {
            const ativa = aberta === i;
            return (
              <div
                key={item.q}
                className={`rounded-2xl border bg-surface/40 backdrop-blur-sm transition-colors duration-300 ${
                  ativa ? 'border-popline-pink/30' : 'border-white/[0.07] hover:border-white/15'
                }`}
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setAberta(ativa ? null : i)}
                    aria-expanded={ativa}
                    aria-controls={`faq-resposta-${i}`}
                    id={`faq-pergunta-${i}`}
                    className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink/50 rounded-2xl"
                  >
                    <span
                      className={`text-base sm:text-lg font-semibold transition-colors duration-200 ${
                        ativa ? 'text-text-primary' : 'text-text-primary/90'
                      }`}
                    >
                      {item.q}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        ativa
                          ? 'gradient-bg border-transparent text-white rotate-45'
                          : 'border-white/10 text-text-secondary'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                </h3>

                {/* grid-rows de 0fr para 1fr anima a altura sem precisar medir o conteúdo */}
                <div
                  id={`faq-resposta-${i}`}
                  role="region"
                  aria-labelledby={`faq-pergunta-${i}`}
                  className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
                    ativa ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-text-secondary leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
