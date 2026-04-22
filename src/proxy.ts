import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Cobre rotas de app (dashboard/admin) e APIs sensíveis. Exclui:
    // - _next/static, _next/image, favicon e assets públicos
    // - /api/debug (dev-only, já protegido internamente)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
