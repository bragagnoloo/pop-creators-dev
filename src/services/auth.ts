import { AuthUser, AuthResult } from '@/types';
import { createClient } from '@/lib/supabase/client';

function mapUser(id: string, email: string, role: 'creator' | 'admin', createdAt: string): AuthUser {
  return { id, email, role, createdAt };
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
    .select('role, email, created_at')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return mapUser(
    session.user.id,
    profile.email,
    profile.role as 'creator' | 'admin',
    profile.created_at
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
    .select('role, email, created_at')
    .eq('id', data.user.id)
    .single();
  if (!profile) {
    return { success: false, error: 'Falha ao carregar perfil.' };
  }
  return { success: true, user: mapUser(data.user.id, profile.email, profile.role as 'creator' | 'admin', profile.created_at) };
}

export type RegisterResult =
  | { success: true; user: AuthUser }
  | { success: true; needsConfirmation: true }
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
    return { success: true, needsConfirmation: true };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { success: true, needsConfirmation: true };
  }
  return { success: true, user };
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Lista todos os usuários (admin only). Usa profiles + created_at.
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, role, created_at');
  if (!data) return [];
  return data.map(p => mapUser(p.id, p.email, p.role, p.created_at));
}
