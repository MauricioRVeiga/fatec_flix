import "server-only";

import { cache } from "react";

import {
  serializeChannelDetail,
  serializeChannelListItem,
  type ApiChannelDetail,
  type ApiChannelListItem,
} from "@/lib/api/serialize-channel";
import type { EmbedRepository } from "@/lib/repositories/embed-repository";
import type { EpgRepository } from "@/lib/repositories/epg-repository";
import { createCategoryRepository } from "@/lib/repositories/category-repository";
import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createEmbedRepository } from "@/lib/repositories/embed-repository";
import { createEpgRepository } from "@/lib/repositories/epg-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { groupBy } from "@/lib/utils";
import type { Database } from "@/types/database";

type ChannelRow = Database["public"]["Tables"]["channels"]["Row"];

async function attachEmbedsAndEpg(
  channels: ChannelRow[],
  embedRepo: EmbedRepository,
  epgRepo: EpgRepository
): Promise<ApiChannelListItem[]> {
  const channelIds = channels.map((channel) => channel.id);

  const [embeds, epgRows] = await Promise.all([
    embedRepo.listActiveByChannelIds(channelIds),
    epgRepo.listByChannelIds(channelIds),
  ]);

  const embedsByChannel = groupBy(embeds, (embed) => embed.channel_id);
  const epgByChannel = new Map(epgRows.map((epg) => [epg.channel_id, epg]));

  return channels.map((channel) =>
    serializeChannelListItem(
      channel,
      embedsByChannel.get(channel.id) ?? [],
      epgByChannel.get(channel.id) ?? null
    )
  );
}

export async function getCatalog(): Promise<ApiChannelListItem[]> {
  const client = createServerSupabaseClient();
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const epgRepo = createEpgRepository(client);

  const channels = await channelRepo.listAllActive();

  return attachEmbedsAndEpg(channels, embedRepo, epgRepo);
}

export interface ListCatalogParams {
  category?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface ListCatalogResult {
  items: ApiChannelListItem[];
  total: number;
}

export async function listCatalog(params: ListCatalogParams): Promise<ListCatalogResult> {
  const client = createServerSupabaseClient();
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const epgRepo = createEpgRepository(client);

  const { rows: channels, total } = await channelRepo.listActive(params);
  const items = await attachEmbedsAndEpg(channels, embedRepo, epgRepo);

  return { items, total };
}

export async function searchCatalog(q: string, limit = 48): Promise<ListCatalogResult> {
  return listCatalog({ q, page: 1, limit });
}

export const getChannelDetail = cache(async (id: string): Promise<ApiChannelDetail | null> => {
  const client = createServerSupabaseClient();
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const epgRepo = createEpgRepository(client);

  const channel = await channelRepo.getActiveById(id);
  if (!channel) {
    return null;
  }

  const [embeds, epg] = await Promise.all([
    embedRepo.listActiveByChannelId(id),
    epgRepo.getByChannelId(id),
  ]);

  return serializeChannelDetail(channel, embeds, epg);
});

export async function getRelatedChannels(
  category: string | null,
  excludeId: string,
  limit = 8
): Promise<ApiChannelListItem[]> {
  if (!category) {
    return [];
  }

  const client = createServerSupabaseClient();
  const channelRepo = createChannelRepository(client);
  const embedRepo = createEmbedRepository(client);
  const epgRepo = createEpgRepository(client);

  const { rows: channels } = await channelRepo.listActive({
    category,
    page: 1,
    limit: limit + 1,
  });
  const related = channels.filter((channel) => channel.id !== excludeId).slice(0, limit);

  return attachEmbedsAndEpg(related, embedRepo, epgRepo);
}

export const resolveCategoryBySlug = cache(async (slug: string): Promise<string | null> => {
  const client = createServerSupabaseClient();
  const categoryRepo = createCategoryRepository(client);

  const categories = await categoryRepo.listWithCounts();
  const match = categories.find((category) => slugify(category.name) === slug);

  return match?.name ?? null;
});
