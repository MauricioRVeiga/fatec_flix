import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { dedupeBy } from "@/lib/utils";

type ChannelEmbedInsert = Database["public"]["Tables"]["channel_embeds"]["Insert"];
type ChannelEmbedRow = Database["public"]["Tables"]["channel_embeds"]["Row"];

export interface UpsertEmbedsResult {
  created: number;
  updated: number;
}

/**
 * Abstração de acesso à tabela `channel_embeds` (PROJECT.md §78).
 */
export function createEmbedRepository(client: SupabaseClient<Database>) {
  return {
    /**
     * Upsert em lote pela chave (`channel_id`, `embed_url`) — o
     * mesmo índice único de PROJECT.md §9.
     */
    async upsertMany(rawEmbeds: ChannelEmbedInsert[]): Promise<UpsertEmbedsResult> {
      if (rawEmbeds.length === 0) {
        return { created: 0, updated: 0 };
      }

      // Mesmo raciocínio do channel-repository: duas linhas no mesmo
      // lote com a mesma chave de conflito (channel_id, embed_url)
      // fariam o upsert inteiro lançar erro no Postgres.
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

    /**
     * Marca como inativos os embeds que não apareceram nesta
     * sincronização (PROJECT.md §23) — nunca deleta.
     */
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

    /** Embeds ativos de um único canal, ordenados por `position`. */
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

    /** Embeds ativos de vários canais de uma vez (evita N+1 na listagem). */
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
  };
}

export type EmbedRepository = ReturnType<typeof createEmbedRepository>;
