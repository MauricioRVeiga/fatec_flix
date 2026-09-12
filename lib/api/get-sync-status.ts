import "server-only";

import { cache } from "react";

import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Quando a última sincronização terminou (PROJECT.md §76) — usado só
 * pra mostrar "programação atualizada há X minutos" discretamente no
 * header, nunca pra bloquear acesso ao catálogo.
 *
 * Usa o client admin pelo mesmo motivo de app/api/health/route.ts:
 * `sync_logs` não tem policy pública (PROJECT.md §15). Nunca lança —
 * se a leitura falhar, o header simplesmente não mostra o aviso, o
 * catálogo continua funcionando normalmente (PROJECT.md §54).
 */
export const getLastSyncTime = cache(async (): Promise<Date | null> => {
  try {
    const client = createAdminSupabaseClient();
    const syncLogRepo = createSyncLogRepository(client);

    const latest = await syncLogRepo.getLatest("channels");
    const timestamp = latest?.finished_at ?? latest?.started_at ?? null;

    return timestamp ? new Date(timestamp) : null;
  } catch {
    return null;
  }
});
