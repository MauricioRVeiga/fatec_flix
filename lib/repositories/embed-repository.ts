import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { dedupeBy, groupBy } from "@/lib/utils";

type ChannelEmbedInsert = Database["public"]["Tables"]["channel_embeds"]["Insert"];
type ChannelEmbedRow = Database["public"]["Tables"]["channel_embeds"]["Row"];

export interface UpsertEmbedsResult {
  created: number;
  updated: number;
}

export function createEmbedRepository(client: SupabaseClient<Database>) {
  return {
    async upsertMany(rawEmbeds: ChannelEmbedInsert[]): Promise<UpsertEmbedsResult> {
      if (rawEmbeds.length === 0) {
        return { created: 0, updated: 0 };
      }

      const embeds = dedupeBy(rawEmbeds, (embed) => `${embed.channel_id}::${embed.embed_url}`);
      const channelIds = [...new Set(embeds.map((embed) => embed.channel_id))];

      const { data: existing, error: selectError } = await client
        .from("channel_embeds")
        .select("channel_id, embed_url")
        .in("channel_id", channelIds);

      if (selectError) {
        throw selectError;
      }

      const existingKeys = new Set(
        (existing ?? []).map((row) => `${row.channel_id}::${row.embed_url}`)
      );

      const { error: upsertError } = await client
        .from("channel_embeds")
        .upsert(embeds, { onConflict: "channel_id,embed_url" });

      if (upsertError) {
        throw upsertError;
      }

      const updated = embeds.filter((embed) =>
        existingKeys.has(`${embed.channel_id}::${embed.embed_url}`)
      ).length;

      return { created: embeds.length - updated, updated };
    },

    async markStaleInactive(syncStartedAt: Date): Promise<number> {
      const { data, error } = await client
        .from("channel_embeds")
        .update({ active: false })
        .lt("last_seen_at", syncStartedAt.toISOString())
        .eq("active", true)
        .select("id");

      if (error) {
        throw error;
      }

      return data?.length ?? 0;
    },

    async listActiveByChannelId(channelId: string): Promise<ChannelEmbedRow[]> {
      const { data, error } = await client
        .from("channel_embeds")
        .select("*")
        .eq("channel_id", channelId)
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async listActiveByChannelIds(channelIds: string[]): Promise<ChannelEmbedRow[]> {
      if (channelIds.length === 0) {
        return [];
      }

      const { data, error } = await client
        .from("channel_embeds")
        .select("*")
        .in("channel_id", channelIds)
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async countActiveByProvider(): Promise<Record<string, number>> {
      const { data, error } = await client
        .from("channel_embeds")
        .select("provider")
        .eq("active", true);

      if (error) {
        throw error;
      }

      const grouped = groupBy(data ?? [], (row) => row.provider);
      const result: Record<string, number> = {};

      for (const [provider, rows] of grouped) {
        result[provider] = rows.length;
      }

      return result;
    },
  };
}

export type EmbedRepository = ReturnType<typeof createEmbedRepository>;
