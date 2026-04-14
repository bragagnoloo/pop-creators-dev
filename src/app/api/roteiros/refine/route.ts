import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { ScriptVariation } from '@/app/api/roteiros/generate/route';

export const runtime = 'nodejs';

interface RefineRequest {
  variation: ScriptVariation;
  instruction: string;
  refinementLevel: number;
}

const SYSTEM_PROMPT = `Você é um roteirista especialista em UGC para criadores brasileiros. Sua função agora é APRIMORAR um roteiro existente seguindo instruções específicas do usuário.

Regras:
- Mantenha o mesmo formato (beats com tempo, legenda, hashtags).
- Aplique fielmente a instrução do usuário, mas preservando o que já funciona.
- Hook sempre nos primeiros 3 segundos.
- Português brasileiro natural.

Responda SEMPRE em JSON válido com este schema exato, sem comentários nem markdown:
{
  "variation": {
    "title": "string",
    "beats": [{ "label": "Hook", "time": "0-3s", "content": "..." }],
    "caption": "string",
    "hashtags": ["tag1"]
  }
}`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key não configurada.' }, { status: 500 });
  }

  let body: RefineRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  if (!body.instruction?.trim() || !body.variation) {
    return NextResponse.json({ error: 'Instrução e roteiro são obrigatórios.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = `Roteiro atual (aprimorado ${body.refinementLevel}x):
${JSON.stringify(body.variation, null, 2)}

Instrução de aprimoramento:
${body.instruction}

Retorne apenas o JSON do roteiro aprimorado, nada mais.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 502 });
    }

    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed: { variation: ScriptVariation };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Falha ao interpretar roteiro.' }, { status: 502 });
    }

    if (!parsed.variation) {
      return NextResponse.json({ error: 'Roteiro aprimorado inválido.' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
