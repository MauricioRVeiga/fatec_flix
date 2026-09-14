import "server-only";

import type { Database } from "@/types/database";

import type { UpstreamChannel } from "./types";

type ChannelInsert = Database["public"]["Tables"]["channels"]["Insert"];
type ChannelEmbedInsert = Database["public"]["Tables"]["channel_embeds"]["Insert"];
type ChannelEpgInsert = Database["public"]["Tables"]["channel_epg"]["Insert"];

export interface NormalizedChannel {
  channel: ChannelInsert;
  embeds: ChannelEmbedInsert[];
  epg: ChannelEpgInsert | null;
}

export function normalizeUpstreamChannel(
  upstream: UpstreamChannel,
  syncStartedAt: Date
): NormalizedChannel {
  const now = syncStartedAt.toISOString();

  const channel: ChannelInsert = {
    id: upstream.id,
    name: upstream.name,
    description: upstream.description ?? null,
    logo_url: upstream.logo_url ?? null,
    category: upstream.category ?? null,
    active: true,
    last_seen_at: now,
    updated_at: now,
  };

  const embeds: ChannelEmbedInsert[] = upstream.embeds.map((embed, index) => ({
    channel_id: upstream.id,
    provider: embed.provider,
    quality: embed.quality ?? null,
    embed_url: embed.embed_url,
    position: index,
    active: true,
    last_seen_at: now,
    updated_at: now,
  }));

  const epg = normalizeEpg(upstream, now);

  return { channel, embeds, epg };
}

function normalizeEpg(
  upstream: UpstreamChannel,
  syncedAt: string
): ChannelEpgInsert | null {
  const current = upstream.epg?.current ?? null;
  const next = upstream.epg?.next ?? null;

  if (!current && !next) {
    return null;
  }

  return {
    channel_id: upstream.id,

    current_title: current?.title ?? null,
    current_description: current?.description ?? null,
    current_formatted_time: current?.formatted_time ?? null,
    current_start_time: toTimestamptz(current?.start_time),
    current_end_time: toTimestamptz(current?.end_time),
    current_image: current?.image ?? null,

    next_title: next?.title ?? null,
    next_description: next?.description ?? null,
    next_formatted_time: next?.formatted_time ?? null,
    next_start_time: toTimestamptz(next?.start_time),
    next_end_time: toTimestamptz(next?.end_time),
    next_image: next?.image ?? null,

    upstream_timestamp: null,

    synced_at: syncedAt,
  };
}

function toTimestamptz(unixSeconds: number | undefined): string | null {
  if (unixSeconds === undefined) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}
