import "server-only";

import { features } from "@/config/features";
import type { Database } from "@/types/database";

type ChannelRow = Database["public"]["Tables"]["channels"]["Row"];
type ChannelEmbedRow = Database["public"]["Tables"]["channel_embeds"]["Row"];
type ChannelEpgRow = Database["public"]["Tables"]["channel_epg"]["Row"];

export interface ApiChannel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  category: string | null;
}

export interface ApiEmbed {
  provider: string;
  quality: string | null;
  /**
   * Ausente quando `features.externalEmbeds` está desligado — o
   * flag não controla só a renderização (PROJECT.md §3.2), a API
   * também não deve devolver a URL do servidor externo enquanto não
   * houver autorização de uso (nem para quem chamar `/api/channels`
   * diretamente, fora da nossa própria UI).
   */
  embed_url?: string;
}

export interface ApiEpgProgram {
  title: string;
  description: string | null;
  formatted_time: string | null;
  start_time: string;
  end_time: string;
  image: string | null;
}

export interface ApiEpg {
  current: ApiEpgProgram | null;
  next: ApiEpgProgram | null;
}

export interface ApiChannelListItem extends ApiChannel {
  embeds: ApiEmbed[];
  epg: ApiEpg | null;
}

export interface ApiChannelDetail {
  channel: ApiChannel;
  embeds: ApiEmbed[];
  epg: ApiEpg | null;
}

/**
 * Defesa em profundidade (PROJECT.md §57/§58): revalida que a URL é
 * https antes de servir, mesmo já validada como tal pelo Zod no
 * momento da sincronização (lib/upstream/schemas.ts) — nunca confiar
 * em dado do banco como automaticamente seguro para o frontend.
 */
function sanitizeHttpsUrl(url: string | null): string | null {
  return url && url.startsWith("https://") ? url : null;
}

function toApiChannel(row: ChannelRow): ApiChannel {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logo_url: sanitizeHttpsUrl(row.logo_url),
    category: row.category,
  };
}

function toApiEmbeds(rows: ChannelEmbedRow[]): ApiEmbed[] {
  return rows
    .filter((row) => row.embed_url.startsWith("https://"))
    .map((row) => ({
      provider: row.provider,
      quality: row.quality,
      ...(features.externalEmbeds ? { embed_url: row.embed_url } : {}),
    }));
}

function toApiEpg(row: ChannelEpgRow | null): ApiEpg | null {
  if (!row) {
    return null;
  }

  const current =
    row.current_title && row.current_start_time && row.current_end_time
      ? {
          title: row.current_title,
          description: row.current_description,
          formatted_time: row.current_formatted_time,
          start_time: row.current_start_time,
          end_time: row.current_end_time,
          image: sanitizeHttpsUrl(row.current_image),
        }
      : null;

  const next =
    row.next_title && row.next_start_time && row.next_end_time
      ? {
          title: row.next_title,
          description: row.next_description,
          formatted_time: row.next_formatted_time,
          start_time: row.next_start_time,
          end_time: row.next_end_time,
          image: sanitizeHttpsUrl(row.next_image),
        }
      : null;

  if (!current && !next) {
    return null;
  }

  return { current, next };
}

export function serializeChannelListItem(
  channel: ChannelRow,
  embeds: ChannelEmbedRow[],
  epg: ChannelEpgRow | null
): ApiChannelListItem {
  return {
    ...toApiChannel(channel),
    embeds: toApiEmbeds(embeds),
    epg: toApiEpg(epg),
  };
}

export function serializeChannelDetail(
  channel: ChannelRow,
  embeds: ChannelEmbedRow[],
  epg: ChannelEpgRow | null
): ApiChannelDetail {
  return {
    channel: toApiChannel(channel),
    embeds: toApiEmbeds(embeds),
    epg: toApiEpg(epg),
  };
}
