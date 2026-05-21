import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const { fbp, fbc, userAgent } = body as { fbp?: string; fbc?: string; userAgent?: string };

  if (!fbp && !fbc && !userAgent) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const update: Record<string, string> = {};
  if (fbp) update.meta_fbp = fbp;
  if (fbc) update.meta_fbc = fbc;
  if (userAgent) update.meta_user_agent = userAgent;

  await supabase.from('profiles').update(update).eq('id', guard.userId);

  return NextResponse.json({ ok: true });
}
