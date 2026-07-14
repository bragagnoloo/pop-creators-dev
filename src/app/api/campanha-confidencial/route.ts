import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidCpf } from '@/lib/cpf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

interface Body {
  nomeCompleto?: string;
  dataNascimento?: string;
  instagram?: string;
  tiktok?: string;
  nacionalidade?: string;
  cpf?: string;
  rg?: string;
  pix?: string;
  endereco?: string;
  cidadeEstado?: string;
  email?: string;
}

export async function POST(request: Request) {
  // Rate limit por IP — evita flood de submissões
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const rl = await checkRateLimit(`campanha-confidencial:${ip}`, 10, 3600000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente mais tarde.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const nome_completo = body.nomeCompleto?.trim();
  const data_nascimento = body.dataNascimento?.trim();
  const instagram = body.instagram?.trim().replace(/^@+/, '');
  const tiktok = body.tiktok?.trim().replace(/^@+/, '');
  const nacionalidade = body.nacionalidade?.trim();
  const cpf = body.cpf?.trim();
  const rg = body.rg?.trim();
  const pix = body.pix?.trim();
  const endereco = body.endereco?.trim();
  const cidade_estado = body.cidadeEstado?.trim();
  const email = body.email?.trim();

  if (
    !nome_completo ||
    !data_nascimento ||
    !instagram ||
    !tiktok ||
    !nacionalidade ||
    !cpf ||
    !rg ||
    !pix ||
    !endereco ||
    !cidade_estado ||
    !email
  ) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  }

  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
  }

  // data_nascimento chega como YYYY-MM-DD (input type=date). Valida formato.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) {
    return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from('campanha_confidencial_inscricoes')
    .insert({
      nome_completo,
      data_nascimento,
      instagram,
      tiktok,
      nacionalidade,
      cpf,
      rg,
      pix,
      endereco,
      cidade_estado,
      email,
    });

  if (dbError) {
    console.error('[campanha-confidencial] db error', dbError.message);
    return NextResponse.json({ error: 'Erro ao salvar inscrição' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
