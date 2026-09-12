import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createEmbedRepository } from "@/lib/repositories/embed-repository";
import { createEpgRepository } from "@/lib/repositories/epg-repository";
import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getUpstreamChannels } from "@/lib/upstream/channels";
import { normalizeUpstreamChannel } from "@/lib/upstream/normalizer";
import type { Database } from "@/types/database";

const SYNC_TYPE = "channels";

export type SyncChannelsStatus = "success" | "partial" | "failed" | "skipped";

export interface SyncChannelsResult {
  status: SyncChannelsStatus;
  received: number;
  created: number;
  updated: number;
  failed: number;
  durationMs: number;
  errorMessage?: string;
}

/**
 * Orquestra a sincronização completa (PROJECT.md §20):
 *
 * upstream → validar → normalizar → upsert channels → upsert embeds
 * → upsert/limpar EPG → marcar removidos como inativos → sync_logs
 *
 * Usa um advisory lock do Postgres para impedir duas execuções
 * simultâneas (PROJECT.md §26). Nunca lança para quem chama: erros
 * viram `status: "failed"` no retorno e em `sync_logs`, para que o
 * cron/endpoint que dispara a sincronização continue respondendo
 * normalmente mesmo quando ela falha (PROJECT.md §54).
 *
 * `client` é injetável (default: `createAdminSupabaseClient()`) só
 * para permitir teste de integração com um fake em memória
 * (tests/helpers/fake-supabase-client.ts) sem tocar no Supabase real
 * — nenhum outro chamador (cron, CLI) precisa passar isso.
 */
export async function syncChannels(
  client: SupabaseClient<Database> = createAdminSupabaseClient()
): Promise<SyncChannelsResult> {
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const epgRepo = createEpgRepository(client);
  const syncLogRepo = createSyncLogRepository(client);

  const startedAt = new Date();

  const { data: lockAcquired, error: lockError } = await client.rpc(
    "try_acquire_sync_lock",
    { p_sync_type: SYNC_TYPE }
  );

  if (lockError) {
    logger.error("channel_sync_lock_error", { message: lockError.message });
    return {
      status: "failed",
      received: 0,
      created: 0,
      updated: 0,
      failed: 0,
      durationMs: Date.now() - startedAt.getTime(),
      errorMessage: lockError.message,
    };
  }

  if (!lockAcquired) {
    logger.warn("channel_sync_skipped", { reason: "already_running" });
    return {
      status: "skipped",
      received: 0,
      created: 0,
      updated: 0,
      failed: 0,
      durationMs: Date.now() - startedAt.getTime(),
      errorMessage: "Another sync is already running",
    };
  }

  try {
    const logId = await syncLogRepo.start(SYNC_TYPE);

    try {
      const upstreamResult = await getUpstreamChannels();

      const normalized = upstreamResult.channels.map((channel) =>
        normalizeUpstreamChannel(channel, startedAt)
      );

      // channels precisa terminar primeiro — channel_embeds tem FK
      // pra channels.id. Embeds e EPG não dependem um do outro (nem
      // upsert de EPG do delete-de-EPG-sem-dado, que opera num
      // conjunto de canais disjunto), então rodam em paralelo.
      const channelUpsert = await channelRepo.upsertMany(
        normalized.map((entry) => entry.channel)
      );

      const embeds = normalized.flatMap((entry) => entry.embeds);
      const epgRows = normalized.map((entry) => entry.epg).filter((epg) => epg !== null);
      const channelIdsWithoutEpg = normalized
        .filter((entry) => entry.epg === null)
        .map((entry) => entry.channel.id)
        .filter((id): id is string => Boolean(id));

      const [embedUpsert] = await Promise.all([
        embedRepo.upsertMany(embeds),
        epgRepo.upsertMany(epgRows),
        epgRepo.deleteForChannels(channelIdsWithoutEpg),
      ]);

      // Canais/embeds "sumidos" (§22/§23) não dependem de nada acima
      // — só olham `last_seen_at < startedAt`, que os upserts desta
      // rodada nunca tocam (eles gravam `last_seen_at = startedAt`).
      const [channelsMarkedInactive, embedsMarkedInactive] = await Promise.all([
        channelRepo.markStaleInactive(startedAt),
        embedRepo.markStaleInactive(startedAt),
      ]);

      const status: SyncChannelsStatus =
        upstreamResult.invalidCount > 0 ? "partial" : "success";

      await syncLogRepo.finish(logId, {
        status,
        records_received: upstreamResult.total,
        records_created: channelUpsert.created,
        records_updated: channelUpsert.updated,
        records_failed: upstreamResult.invalidCount,
        metadata: {
          embeds_created: embedUpsert.created,
          embeds_updated: embedUpsert.updated,
          channels_marked_inactive: channelsMarkedInactive,
          embeds_marked_inactive: embedsMarkedInactive,
        },
      });

      const durationMs = Date.now() - startedAt.getTime();

      logger.info("channel_sync", {
        status,
        received: upstreamResult.total,
        created: channelUpsert.created,
        updated: channelUpsert.updated,
        failed: upstreamResult.invalidCount,
        duration_ms: durationMs,
      });

      return {
        status,
        received: upstreamResult.total,
        created: channelUpsert.created,
        updated: channelUpsert.updated,
        failed: upstreamResult.invalidCount,
        durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await syncLogRepo
        .finish(logId, { status: "failed", error_message: message })
        .catch((finishError) => {
          logger.error("channel_sync_log_finish_failed", {
            message:
              finishError instanceof Error ? finishError.message : String(finishError),
          });
        });

      logger.error("channel_sync_failed", { message });

      return {
        status: "failed",
        received: 0,
        created: 0,
        updated: 0,
        failed: 0,
        durationMs: Date.now() - startedAt.getTime(),
        errorMessage: message,
      };
    }
  } finally {
    const { error: releaseError } = await client.rpc("release_sync_lock", {
      p_sync_type: SYNC_TYPE,
    });

    if (releaseError) {
      logger.error("channel_sync_lock_release_failed", {
        message: releaseError.message,
      });
    }
  }
}
