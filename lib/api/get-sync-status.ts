import "server-only";

import { cache } from "react";

import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
