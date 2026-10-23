import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

// Fim do primeiro acesso (senha criada, ou "manter a senha atual"): tira a marca
// de pendente para que o link deixe de valer e as renovações voltem ao e-mail
// normal de "plano ativado".
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (user.app_metadata?.first_access_pending !== true) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, first_access_pending: false },
  });
  if (error) {
    console.error('[primeiro-acesso] falha ao concluir', user.id, error);
    return NextResponse.json({ error: 'retry' }, { status: 503 });
  }

  // Invalida links que tenham sobrado.
  await admin.from('account_access_tokens').update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id).is('used_at', null);

  return NextResponse.json({ ok: true });
}
