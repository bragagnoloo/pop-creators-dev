import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ALLOWED_PATHS = ['/pre-venda', '/pre-venda/obrigado'];
const ALLOWED_PREFIXES = ['/_next/', '/favicon', '/api/pre-cadastro'];
const BYPASS_COOKIE = 'popline_preview';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.PRE_LAUNCH === 'true') {
    const previewToken = process.env.PREVIEW_TOKEN;

    // Activate bypass via ?preview=TOKEN → set cookie and redirect clean
    const qToken = request.nextUrl.searchParams.get('preview');
    if (previewToken && qToken === previewToken) {
      const res = NextResponse.redirect(new URL(pathname, request.url));
      res.cookies.set(BYPASS_COOKIE, previewToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Valid bypass cookie → full access + Supabase session refresh
    const cookieToken = request.cookies.get(BYPASS_COOKIE)?.value;
    if (previewToken && cookieToken === previewToken) {
      return updateSession(request);
    }

    // Regular visitor → only allow pre-venda routes and static assets
    const isAllowed =
      ALLOWED_PATHS.includes(pathname) ||
      ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/pre-venda', request.url));
    }
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
