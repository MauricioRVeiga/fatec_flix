import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { dedupeBy } from "@/lib/utils";

type ChannelEpgInsert = Database["public"]["Tables"]["channel_epg"]["Insert"];
type ChannelEpgRow = Database["public"]["Tables"]["channel_epg"]["Row"];

export function createEpgRepository(client: SupabaseClient<Database>) {
  return {
    async upsertMany(rawEpgRows: ChannelEpgInsert[]): Promise<void> {
      if (rawEpgRows.length === 0) {
        return;
      }

      const epgRows = dedupeBy(rawEpgRows, (epg) => epg.channel_id);

      const { error } = await client
        .from("channel_epg")
        .upsert(epgRows, { onConflict: "channel_id" });

      if (error) {
        throw error;
      }
    },

    async deleteForChannels(channelIds: string[]): Promise<void> {
      if (channelIds.length === 0) {
        return;
      }

      const { error } = await client
        .from("channel_epg")
        .delete()
        .in("channel_id", channelIds);

      if (error) {
        throw error;
      }
    },

    async getByChannelId(channelId: string): Promise<ChannelEpgRow | null> {
      const { data, error } = await client
        .from("channel_epg")
        .select("*")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },

    async listByChannelIds(channelIds: string[]): Promise<ChannelEpgRow[]> {
      if (channelIds.length === 0) {
        return [];
      }

      const { data, error } = await client
        .from("channel_epg")
        .select("*")
        .in("channel_id", channelIds);

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  };
}

export type EpgRepository = ReturnType<typeof createEpgRepository>;
