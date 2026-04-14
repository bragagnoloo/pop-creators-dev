import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { requirePaidUser } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type Mode = 'ugc' | 'personal';
type PersonalFormat = 'educativo' | 'storytime' | 'review' | 'opiniao' | 'tutorial' | 'entretenimento';

interface GenerateRequest {
  mode: Mode;
  product?: string;
  format?: PersonalFormat;
  briefing: string;
  platform: 'reels' | 'tiktok' | 'shorts' | 'stories';
  duration: 15 | 30 | 45 | 60;
  objective: 'vender' | 'engajar' | 'educar' | 'divertir';
  tone: 'casual' | 'profissional' | 'divertido' | 'emocional';
  notes?: string;
}

export interface ScriptBeat {
  label: string;
  time: string;
  content: string;
}

export interface ScriptVariation {
  title: string;
  beats: ScriptBeat[];
  caption: string;
  hashtags: string[];
}

const BASE_RULES = `Regras comuns:
- Escreva em português brasileiro, linguagem natural e coloquial quando o tom pedir.
- Hook obrigatoriamente nos primeiros 3 segundos — a primeira frase precisa prender atenção.
- Divida em beats com marcação de tempo (ex: "0-3s", "3-10s").
- Cada beat tem: rótulo curto, intervalo de tempo e conteúdo acionável (o que falar + o que mostrar).
- Sempre inclua sugestão de legenda curta e 5-8 hashtags relevantes.
- Produza exatamente 3 variações diferentes em abordagem.

Responda SEMPRE em JSON válido com este schema exato, sem comentários nem markdown:
{
  "variations": [
    {
      "title": "string curta descrevendo a abordagem",
      "beats": [
        { "label": "Hook", "time": "0-3s", "content": "texto do beat" }
      ],
      "caption": "legenda sugerida",
      "hashtags": ["tag1", "tag2"]
    }
  ]
}`;

const UGC_PROMPT = `Você é um roteirista especialista em UGC (User Generated Content) para criadores brasileiros. Seu foco é gerar roteiros publicitários que parecem autênticos — o criador falando de um produto/marca como se fosse recomendação genuína, não propaganda.

Diretrizes UGC:
- Beats típicos: Hook, Problema/Dor, Apresentação do produto, Demonstração/Prova, CTA.
- Integre o produto de forma orgânica, evite linguagem publicitária óbvia ("compre agora").
- CTA claro mas sutil (ex: "link na bio", "cupom na descrição").

${BASE_RULES}`;

const PERSONAL_PROMPT = `Você é um roteirista especialista em conteúdo autoral para criadores brasileiros. Seu foco é gerar roteiros de conteúdo próprio — sem produto patrocinado, com objetivo de valor, engajamento ou entretenimento para a audiência do criador.

Diretrizes de conteúdo próprio:
- NÃO mencione produtos ou marcas a menos que explicitamente pedido no briefing.
- Beats típicos variam por formato:
  - Educativo: Hook, Contexto, Conceito principal, Exemplo, Conclusão acionável.
  - Storytime: Hook, Setup, Conflito, Virada, Desfecho.
  - Review: Hook, Expectativa, Experiência, Prós/Contras, Veredito.
  - Opinião: Hook, Tese, Argumentos, Provocação, CTA de engajamento.
  - Tutorial: Hook, Resultado prometido, Passo a passo, Dica extra, CTA salvar.
  - Entretenimento: Hook, Premissa, Desenvolvimento com ritmo, Punchline.
- CTA focado em engajamento (comentar, salvar, compartilhar), não em vendas.

${BASE_RULES}`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key não configurada.' }, { status: 500 });
  }

  // Auth + plano pago
  const guard = await requirePaidUser();
  if (guard instanceof NextResponse) return guard;

  // Rate limit: 10 gerações por minuto por usuário
  const rl = checkRateLimit(`gen:${guard.userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas requisições. Tente novamente em ${Math.ceil(rl.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  if (!body.briefing?.trim()) {
    return NextResponse.json({ error: 'Informe o tema ou briefing.' }, { status: 400 });
  }
  if (body.mode === 'ugc' && !body.product?.trim()) {
    return NextResponse.json({ error: 'Informe o produto ou marca.' }, { status: 400 });
  }
  if (body.mode === 'personal' && !body.format) {
    return NextResponse.json({ error: 'Informe o formato do conteúdo.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = `Gere 3 variações de roteiro para:
${body.mode === 'ugc' ? `- Produto/Marca: ${body.product}` : `- Formato: ${body.format}`}
- Tema / Briefing: ${body.briefing}
- Plataforma: ${body.platform}
- Duração: ${body.duration} segundos
- Objetivo: ${body.objective}
- Tom: ${body.tone}
${body.notes ? `- Observações adicionais: ${body.notes}` : ''}

Retorne apenas o JSON, nada mais.`;

  const systemPrompt = body.mode === 'personal' ? PERSONAL_PROMPT : UGC_PROMPT;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 502 });
    }

    const raw = textBlock.text.trim();
    // Strip possible code fences defensively
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed: { variations: ScriptVariation[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Falha ao interpretar roteiro gerado.' }, { status: 502 });
    }

    if (!parsed.variations || !Array.isArray(parsed.variations)) {
      return NextResponse.json({ error: 'Roteiro sem variações.' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
