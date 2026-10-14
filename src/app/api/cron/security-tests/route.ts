import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runSecurityTests } from '@/lib/security-tests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Roda a suíte de permissões contra a API de produção. Chamada pelo Vercel Cron
// (diário) e por `npm run test:security` depois de aplicar migration.
// Falha → alerta crítico em security_alerts → email para a equipe.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;

  let report: Awaited<ReturnType<typeof runSecurityTests>>;
  try {
    report = await runSecurityTests(origin);
  } catch (err) {
    report = {
      results: [{ id: 'setup', description: 'Preparação da suíte de testes', passed: false, detail: (err as Error).message }],
      failed: 1,
    };
  }

  if (report.failed > 0) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    const failures = report.results.filter(r => !r.passed);
    await admin.from('security_alerts').insert({
      kind: 'security_test_failed',
      severity: 'critical',
      title: `Teste de segurança falhou: ${failures.length} de ${report.results.length}`,
      details: {
        'O que significa': 'Uma regra de permissão que deveria bloquear um ataque não bloqueou. Revisar a última migration aplicada.',
        ...Object.fromEntries(failures.map(f => [f.description, f.detail])),
      },
    });
  }

  return NextResponse.json({
    ok: report.failed === 0,
    total: report.results.length,
    failed: report.failed,
    results: report.results,
  });
}
