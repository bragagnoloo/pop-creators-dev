import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Retorna a instância singleton do Supabase Browser Client.
 * createBrowserClient lê e escreve cookies do document, então uma instância
 * por aba é suficiente (e evita listeners duplicados de onAuthStateChange).
 */
export function createClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return cached;
}
