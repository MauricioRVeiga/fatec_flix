import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getUpstreamHealth } from "@/lib/upstream/health";

export const dynamic = "force-dynamic";

// Se uma sincronização ficou "running" por mais tempo que isso, a
// função serverless provavelmente caiu/foi encerrada no meio (ex.:
// timeout da Vercel) antes de conseguir gravar o status final — trata
// como falha em vez de mascarar um problema real (PROJECT.md §75/§76).
const STUCK_SYNC_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * PROJECT.md §28 `/api/health`. Usa o client admin (service role)
 * porque `sync_logs` não tem policy pública de leitura (PROJECT.md
 * §15) — é a única rota que legitimamente precisa disso, só para
 * este read específico, nunca repassado ao cliente.
 *
 * Nunca expor segredos, connection strings, stack traces ou detalhes
 * internos na resposta (PROJECT.md §28, SECURITY.md).
 */
export async function GET() {
  let databaseOk = false;
  let channelsCount = 0;
  let lastSync: string | null = null;
  let lastSyncFailed = false;

  try {
    const client = createAdminSupabaseClient();
    const channelRepo = createChannelRepository(client);
    const syncLogRepo = createSyncLogRepository(client);

    channelsCount = await channelRepo.countActive();
    databaseOk = true;

    const latestSync = await syncLogRepo.getLatest("channels");
    lastSync = latestSync?.finished_at ?? latestSync?.started_at ?? null;

    const stuckRunning =
      latestSync?.status === "running" &&
      Date.now() - new Date(latestSync.started_at).getTime() > STUCK_SYNC_THRESHOLD_MS;

    lastSyncFailed = latestSync === null || latestSync.status === "failed" || stuckRunning;
  } catch (error) {
    logger.error("api_health_database_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    databaseOk = false;
  }

  // getUpstreamHealth() nunca lança — falha vira "unavailable" (PROJECT.md §27).
  const upstreamHealth = await getUpstreamHealth();

  const status: "healthy" | "degraded" | "unhealthy" = !databaseOk
    ? "unhealthy"
    : upstreamHealth.status !== "healthy" || lastSyncFailed
      ? "degraded"
      : "healthy";

  // GUARDA: esta rota é pública/sem autenticação. Nunca adicionar
  // `latestSync.error_message` (ou qualquer outro dado de sync_logs)
  // aqui sem antes decidir se isso deveria exigir autenticação — o
  // client admin usado acima só se justifica por esta resposta ficar
  // restrita a agregados (booleano/contagem/timestamp).
  return NextResponse.json({
    status,
    database: databaseOk,
    upstream: { status: upstreamHealth.status },
    lastSync,
    channels: channelsCount,
  });
}
