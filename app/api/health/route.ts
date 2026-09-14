import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getUpstreamHealth } from "@/lib/upstream/health";
import { toErrorMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STUCK_SYNC_THRESHOLD_MS = 15 * 60 * 1000;

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
      message: toErrorMessage(error),
    });
    databaseOk = false;
  }

  const upstreamHealth = await getUpstreamHealth();

  const status: "healthy" | "degraded" | "unhealthy" = !databaseOk
    ? "unhealthy"
    : upstreamHealth.status !== "healthy" || lastSyncFailed
      ? "degraded"
      : "healthy";

  return NextResponse.json({
    status,
    database: databaseOk,
    upstream: { status: upstreamHealth.status },
    lastSync,
    channels: channelsCount,
  });
}
