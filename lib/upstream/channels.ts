import "server-only";

import { logger } from "@/lib/logger";

import { upstreamFetch } from "./client";
import { channelSchema, upstreamChannelsResponseSchema } from "./schemas";
import type { UpstreamChannelsResult } from "./types";

/**
 * Busca os canais na API upstream.
 *
 * Valida o envelope da resposta (`success`/`data`/`total`) e depois
 * cada canal individualmente: um canal com campo inválido é
 * descartado e logado, mas não derruba a sincronização inteira
 * (PROJECT.md §19).
 */
export async function getUpstreamChannels(): Promise<UpstreamChannelsResult> {
  const response = await upstreamFetch("/channels", upstreamChannelsResponseSchema);

  const channels = [];
  let invalidCount = 0;

  for (const rawChannel of response.data) {
    const parsed = channelSchema.safeParse(rawChannel);

    if (parsed.success) {
      channels.push(parsed.data);
      continue;
    }

    invalidCount++;
    const id =
      typeof rawChannel === "object" && rawChannel !== null && "id" in rawChannel
        ? String((rawChannel as { id: unknown }).id)
        : "unknown";

    logger.warn("upstream_channel_invalid", {
      channel_id: id,
      issues: parsed.error.message,
    });
  }

  if (invalidCount > 0) {
    logger.warn("upstream_channels_partial", {
      received: response.data.length,
      valid: channels.length,
      invalid: invalidCount,
    });
  }

  return {
    channels,
    total: response.total ?? response.data.length,
    invalidCount,
  };
}
