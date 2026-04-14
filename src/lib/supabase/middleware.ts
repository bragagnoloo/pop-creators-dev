import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Falha explícita se env vars ausentes — evita 500 silencioso e vaza diagnóstico.
  if (!url || !anonKey) {
    console.error('[proxy] Supabase env vars ausentes', {
      hasUrl: !!url,
      hasKey: !!anonKey,
    });
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: apenas chamar getUser() — não colocar lógica entre createServerClient e getUser()
  await supabase.auth.getUser();

  return response;
}
