import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client Supabase com a Service Role Key — ignora RLS.
 *
 * ATENÇÃO: server-only. O import "server-only" no topo deste arquivo
 * faz o build falhar caso algum Client Component tente importá-lo,
 * reforçando PROJECT.md §15/§56 (a service role nunca pode chegar ao
 * browser).
 *
 * Uso restrito a: serviço de sincronização (services/sync-channels.ts)
 * e ao endpoint de cron (app/api/cron/sync-channels), que precisam
 * escrever no banco ignorando as policies de leitura pública.
 * Nunca usar este client para simples leitura de dados — para isso,
 * use lib/supabase/server.ts.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
