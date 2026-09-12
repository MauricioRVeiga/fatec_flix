import type { MetadataRoute } from "next";

import { getCatalog } from "@/lib/api/get-catalog";
import { slugify } from "@/lib/slug";

// Mesma frequência de sincronização do catálogo (PROJECT.md §51/§53).
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const catalog = await getCatalog();

  const categoryNames = [
    ...new Set(catalog.map((channel) => channel.category).filter((c): c is string => Boolean(c))),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categoryNames.map((name) => ({
    url: `${baseUrl}/categoria/${slugify(name)}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const channelRoutes: MetadataRoute.Sitemap = catalog.map((channel) => ({
    url: `${baseUrl}/canal/${channel.id}`,
    // EPG muda a cada poucos minutos, então o conteúdo da página
    // muda com frequência mesmo sem o canal em si mudar.
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [
    { url: baseUrl, changeFrequency: "hourly", priority: 1 },
    ...categoryRoutes,
    ...channelRoutes,
  ];
}
