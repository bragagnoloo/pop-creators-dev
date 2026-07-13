import { AuthUser, AuthResult, UserRole, AdminTab } from '@/types';
import { createClient } from '@/lib/supabase/client';

function mapUser(id: string, email: string, role: UserRole, createdAt: string, extraTabs: AdminTab[] = []): AuthUser {
  return { id, email, role, createdAt, extraTabs };
}

/**
 * Busca o AuthUser atual (da sessão + role vinda de profiles).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  // getSession() reads from the local cookie — no network request, unlike getUser()
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, created_at, extra_admin_tabs')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return mapUser(
    session.user.id,
    profile.email,
    profile.role as UserRole,
    profile.created_at,
    (profile.extra_admin_tabs ?? []) as AdminTab[],
  );
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const supabase = createClient();
  // signInWithPassword already returns the user — avoid a second getUser() round-trip
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { success: false, error: 'Email ou senha incorretos.' };
  }
  if (!data.user) {
    return { success: false, error: 'Falha ao carregar perfil.' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, created_at, extra_admin_tabs')
    .eq('id', data.user.id)
    .single();
  if (!profile) {
    return { success: false, error: 'Falha ao carregar perfil.' };
  }
  return {
    success: true,
    user: mapUser(
      data.user.id,
      profile.email,
      profile.role as UserRole,
      profile.created_at,
      (profile.extra_admin_tabs ?? []) as AdminTab[],
    ),
  };
}

export type RegisterResult =
  | { success: true; user: AuthUser }
  | { success: true; needsConfirmation: true; userId: string; userEmail: string }
  | { success: false; error: string };

export async function register(email: string, password: string): Promise<RegisterResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { success: false, error: 'Este email já está cadastrado.' };
    }
    return { success: false, error: error.message };
  }
  // Sem sessão = confirmação de email habilitada no projeto Supabase.
  if (!data.session) {
    return { success: true, needsConfirmation: true, userId: data.user?.id ?? '', userEmail: email };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { success: true, needsConfirmation: true, userId: data.user?.id ?? '', userEmail: email };
  }
  return { success: true, user };
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return error ? { error: error.message } : {};
}

/**
 * Lista todos os usuários (admin only). Usa profiles + created_at.
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  const supabase = createClient();
  // Ordena por created_at desc: mesmo que o PostgREST cape em 1000 linhas, os
  // cadastros recentes (usados no gráfico "novos usuários por dia") sempre entram.
  const { data } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map(p => mapUser(p.id, p.email, p.role as UserRole, p.created_at));
}

/**
 * Contagem exata de usuários não-admin (head + count, sem trazer linhas).
 * Não sofre o teto de 1000 linhas do PostgREST.
 */
export async function countUsers(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'admin');
  return count ?? 0;
}
