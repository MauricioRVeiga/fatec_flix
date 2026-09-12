import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, SyncStatus } from "@/types/database";

type SyncLogUpdate = Database["public"]["Tables"]["sync_logs"]["Update"];
type SyncLogRow = Database["public"]["Tables"]["sync_logs"]["Row"];

export interface FinishSyncLogInput {
  status: SyncStatus;
  records_received?: number;
  records_created?: number;
  records_updated?: number;
  records_failed?: number;
  upstream_status?: number | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Abstração de acesso à tabela `sync_logs` (PROJECT.md §11, §75).
 */
export function createSyncLogRepository(client: SupabaseClient<Database>) {
  return {
    async start(syncType: string): Promise<number> {
      const { data, error } = await client
        .from("sync_logs")
        .insert({
          sync_type: syncType,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    },

    async finish(id: number, input: FinishSyncLogInput): Promise<void> {
      const update: SyncLogUpdate = {
        ...input,
        finished_at: new Date().toISOString(),
      };

      const { error } = await client.from("sync_logs").update(update).eq("id", id);

      if (error) {
        throw error;
      }
    },

    /** Sincronização mais recente (por `started_at`), para `/api/health` (PROJECT.md §75, §76). */
    async getLatest(syncType: string): Promise<SyncLogRow | null> {
      const { data, error } = await client
        .from("sync_logs")
        .select("*")
        .eq("sync_type", syncType)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  };
}

export type SyncLogRepository = ReturnType<typeof createSyncLogRepository>;
