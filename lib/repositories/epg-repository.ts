import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { dedupeBy } from "@/lib/utils";

type ChannelEpgInsert = Database["public"]["Tables"]["channel_epg"]["Insert"];
type ChannelEpgRow = Database["public"]["Tables"]["channel_epg"]["Row"];

/**
 * Abstração de acesso à tabela `channel_epg` (PROJECT.md §78, §10).
 * É uma tabela de snapshot (1 linha por canal), diferente de
 * `channels`/`channel_embeds` não tem coluna `active` — ou o canal
 * tem uma linha de EPG atual, ou não tem nenhuma.
 */
export function createEpgRepository(client: SupabaseClient<Database>) {
  return {
    async upsertMany(rawEpgRows: ChannelEpgInsert[]): Promise<void> {
      if (rawEpgRows.length === 0) {
        return;
      }

      // Mesmo raciocínio de channel/embed-repository: evita erro do
      // Postgres se o mesmo channel_id aparecer duas vezes no lote.
      const epgRows = dedupeBy(rawEpgRows, (epg) => epg.channel_id);

      const { error } = await client
        .from("channel_epg")
        .upsert(epgRows, { onConflict: "channel_id" });

      if (error) {
        throw error;
      }
    },

    /**
     * Remove o snapshot de EPG dos canais que foram sincronizados
     * com sucesso mas não trouxeram `epg` desta vez — evita mostrar
     * "programa atual" desatualizado quando o upstream deixa de
     * enviar EPG para um canal (PROJECT.md §41).
     */
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

    /** EPG de vários canais de uma vez (evita N+1 na listagem). */
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
