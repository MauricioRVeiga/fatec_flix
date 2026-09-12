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
  /** Busca em name/description/category (PROJECT.md §42). */
  q?: string;
  page: number;
  limit: number;
}

export interface ListActiveChannelsResult {
  rows: ChannelRow[];
  total: number;
}

/**
 * Abstração de acesso à tabela `channels` (PROJECT.md §78) — nenhuma
 * query Supabase deve existir fora daqui.
 */
export function createChannelRepository(client: SupabaseClient<Database>) {
  return {
    /**
     * Upsert em lote por `id`. Retorna quantos eram novos vs. já
     * existentes, para alimentar `sync_logs` (PROJECT.md §20).
     */
    async upsertMany(rawChannels: ChannelInsert[]): Promise<UpsertChannelsResult> {
      if (rawChannels.length === 0) {
        return { created: 0, updated: 0 };
      }

      // Se o upstream repetir o mesmo id na mesma resposta, um upsert
      // com duas linhas de mesma chave de conflito faria o Postgres
      // lançar "ON CONFLICT DO UPDATE command cannot affect row a
      // second time" e derrubar a sincronização inteira.
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

    /**
     * Marca como inativos os canais que não apareceram nesta
     * sincronização (PROJECT.md §22) — nunca deleta.
     */
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

    /**
     * Lista canais ativos com filtro de categoria/busca e paginação
     * (PROJECT.md §28, §42). Só devolve canais `active = true` — a
     * mesma regra que a policy de RLS pública já aplica, mantida
     * aqui explicitamente para o client admin (que ignora RLS) se
     * comportar igual ao client público.
     */
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
        // .or() concatena condições numa string de filtro do PostgREST —
        // por isso o termo passa por sanitizeSearchTerm antes (remove
        // vírgula/parênteses, que têm significado estrutural nesse
        // formato) e por escapeIlikeSpecialChars (escapa curingas de
        // LIKE) — nunca interpolar `q` cru aqui.
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

    /**
     * Todos os canais ativos, sem paginação — usado para montar as
     * prateleiras da homepage (destaque/ao vivo/categorias), onde é
     * mais simples filtrar em memória do que repetir a query por
     * seção. Assume um catálogo pequeno (dezenas a poucas centenas de
     * canais, como o upstream atual); se crescer muito, trocar por
     * `listActive()` paginado por seção.
     */
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
  };
}

export type ChannelRepository = ReturnType<typeof createChannelRepository>;

const MAX_SEARCH_TERM_LENGTH = 100;

/**
 * Remove caracteres com significado estrutural na sintaxe de filtro
 * do PostgREST (`,` separa condições, `(`/`)` agrupam) e limita o
 * tamanho — entrada de usuário nunca deve poder alterar a forma da
 * query, só o valor buscado (PROJECT.md/SECURITY — Injection).
 */
function sanitizeSearchTerm(raw: string | undefined): string {
  if (!raw) {
    return "";
  }

  return raw.replace(/[,()]/g, "").trim().slice(0, MAX_SEARCH_TERM_LENGTH);
}

/** Escapa curingas de LIKE/ILIKE (`%`, `_`) para tratá-los como literais. */
function escapeIlikeSpecialChars(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}
