import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client Supabase para uso em Client Components (browser).
 *
 * Usa apenas a anon key, respeitando as políticas de RLS. Reservado
 * para funcionalidades futuras no browser (ex.: Supabase Auth,
 * PROJECT.md §14) — a leitura do catálogo de canais pelo usuário
 * final deve passar pela nossa API interna, não por este client
 * diretamente (PROJECT.md §3.1).
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios."
    );
  }

  return createClient<Database>(url, anonKey);
}
