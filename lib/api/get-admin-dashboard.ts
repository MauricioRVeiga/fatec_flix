import "server-only";

import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createEmbedRepository } from "@/lib/repositories/embed-repository";
import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getUpstreamHealth } from "@/lib/upstream/health";
import type { SyncLogRow } from "@/types/database";
import type { UpstreamHealthResult } from "@/lib/upstream/types";

const SYNC_TYPE = "channels";
const RECENT_SYNC_LOGS_LIMIT = 10;

export interface AdminDashboardData {
  upstreamHealth: UpstreamHealthResult;
  latestSync: SyncLogRow | null;
  recentSyncLogs: SyncLogRow[];
  activeChannels: number;
  inactiveChannels: number;
  providerCounts: Record<string, number>;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const client = createAdminSupabaseClient();
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const syncLogRepo = createSyncLogRepository(client);

  const [
    upstreamHealth,
    latestSync,
    recentSyncLogs,
    activeChannels,
    inactiveChannels,
    providerCounts,
  ] = await Promise.all([
    getUpstreamHealth(),
    syncLogRepo.getLatest(SYNC_TYPE),
    syncLogRepo.listRecent(SYNC_TYPE, RECENT_SYNC_LOGS_LIMIT),
    channelRepo.countActive(),
    channelRepo.countInactive(),
    embedRepo.countActiveByProvider(),
  ]);

  return {
    upstreamHealth,
    latestSync,
    recentSyncLogs,
    activeChannels,
    inactiveChannels,
    providerCounts,
  };
}
