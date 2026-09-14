import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { dedupeBy } from "@/lib/utils";

type ChannelInsert = Database["public"]["Tables"]["channels"]["Insert"];
type ChannelRow = Database["public"]["Tables"]["channels"]["Row"];

export interface UpsertChannelsResult {
  created: number;
  updated: number;
}

export interface ListActiveChannelsParams {
  category?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface ListActiveChannelsResult {
  rows: ChannelRow[];
  total: number;
}

export function createChannelRepository(client: SupabaseClient<Database>) {
  return {
    async upsertMany(rawChannels: ChannelInsert[]): Promise<UpsertChannelsResult> {
      if (rawChannels.length === 0) {
        return { created: 0, updated: 0 };
      }

      const channels = dedupeBy(rawChannels, (channel) => channel.id);
      const ids = channels.map((channel) => channel.id);

      const { data: existing, error: selectError } = await client
        .from("channels")
        .select("id")
        .in("id", ids);

      if (selectError) {
        throw selectError;
      }

      const existingIds = new Set((existing ?? []).map((row) => row.id));

      const { error: upsertError } = await client
        .from("channels")
        .upsert(channels, { onConflict: "id" });

      if (upsertError) {
        throw upsertError;
      }

      const updated = channels.filter((channel) => existingIds.has(channel.id)).length;

      return { created: channels.length - updated, updated };
    },

    async markStaleInactive(syncStartedAt: Date): Promise<number> {
      const { data, error } = await client
        .from("channels")
        .update({ active: false })
        .lt("last_seen_at", syncStartedAt.toISOString())
        .eq("active", true)
        .select("id");

      if (error) {
        throw error;
      }

      return data?.length ?? 0;
    },

    async listActive(
      params: ListActiveChannelsParams
    ): Promise<ListActiveChannelsResult> {
      const { category, q, page, limit } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = client
        .from("channels")
        .select("*", { count: "exact" })
        .eq("active", true)
        .order("name", { ascending: true })
        .range(from, to);

      if (category) {
        query = query.eq("category", category);
      }

      const searchTerm = sanitizeSearchTerm(q);
      if (searchTerm) {
        const pattern = `%${escapeIlikeSpecialChars(searchTerm)}%`;
        query = query.or(
          `name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return { rows: data ?? [], total: count ?? 0 };
    },

    async listAllActive(): Promise<ChannelRow[]> {
      const { data, error } = await client
        .from("channels")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async getActiveById(id: string): Promise<ChannelRow | null> {
      const { data, error } = await client
        .from("channels")
        .select("*")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },

    async countActive(): Promise<number> {
      const { count, error } = await client
        .from("channels")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },

    async countInactive(): Promise<number> {
      const { count, error } = await client
        .from("channels")
        .select("*", { count: "exact", head: true })
        .eq("active", false);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
  };
}

export type ChannelRepository = ReturnType<typeof createChannelRepository>;

const MAX_SEARCH_TERM_LENGTH = 100;

function sanitizeSearchTerm(raw: string | undefined): string {
  if (!raw) {
    return "";
  }

  return raw.replace(/[,()]/g, "").trim().slice(0, MAX_SEARCH_TERM_LENGTH);
}

function escapeIlikeSpecialChars(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}
