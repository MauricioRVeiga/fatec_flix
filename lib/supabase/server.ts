import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client Supabase para uso no servidor (Server Components, Route
 * Handlers) que apenas leem dados.
 *
 * Usa a anon key — respeita RLS, sem privilégios de escrita além do
 * que as policies permitirem. Para escrita administrativa (sync,
 * cron) use lib/supabase/admin.ts.
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios."
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}
