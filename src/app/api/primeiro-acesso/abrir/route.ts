import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, ACCESS_COOKIE_PATH, isTokenShape } from '@/lib/purchase-access';

// Link do e-mail de primeiro acesso. NÃO consome o token: antivírus de e-mail
// abrem links sozinhos e gastariam o acesso antes da pessoa. Só guarda o token
// num cookie httpOnly e manda para /primeiro-acesso com a URL limpa, para que
// ele nunca apareça numa URL de página (o Meta Pixel registra a URL inteira).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const res = NextResponse.redirect(new URL('/primeiro-acesso', req.url), 303);
  res.headers.set('Referrer-Policy', 'no-referrer');

  if (isTokenShape(token)) {
    res.cookies.set(ACCESS_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     ACCESS_COOKIE_PATH,
      maxAge:   15 * 60,
    });
  }
  return res;
}
