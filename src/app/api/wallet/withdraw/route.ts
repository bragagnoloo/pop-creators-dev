import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  // Rate limit conservador: 5 saques/hora por usuário (evita disparo acidental ou abuso)
  const rl = await checkRateLimit(`withdraw:${guard.userId}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas solicitações de saque. Tente novamente em ${Math.ceil(rl.retryAfterMs / 60_000)} min.` },
      { status: 429 }
    );
  }

  let body: { amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 });
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ error: 'Valor acima do limite permitido.' }, { status: 400 });
  }

  // Chama RPC atômico — a função usa auth.uid() do JWT do usuário e faz
  // lock FOR UPDATE nos créditos, garantindo que não há race com chamadas
  // concorrentes do mesmo usuário.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_withdrawal', { p_amount: amount });

  if (error) {
    console.error('[withdraw] rpc error', error);
    return NextResponse.json({ error: 'Falha ao processar saque.' }, { status: 500 });
  }

  const result = data as
    | { success: true; withdrawal: Record<string, unknown> }
    | { success: false; error: string }
    | null;

  if (!result) {
    return NextResponse.json({ error: 'Resposta inesperada.' }, { status: 500 });
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
