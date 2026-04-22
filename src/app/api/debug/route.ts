import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEBUG_TOKEN = process.env.DEBUG_ENDPOINT_TOKEN;

export async function GET(request: Request) {
  // Em produção, exige DEBUG_ENDPOINT_TOKEN no header Authorization.
  // Em desenvolvimento, retorna direto para facilitar diagnóstico local.
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get('authorization');
    const expected = DEBUG_TOKEN ? `Bearer ${DEBUG_TOKEN}` : null;
    if (!expected || auth !== expected) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
  }

  return NextResponse.json({
    ok: true,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) ?? null,
    vercelRegion: process.env.VERCEL_REGION ?? null,
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
  });
}
