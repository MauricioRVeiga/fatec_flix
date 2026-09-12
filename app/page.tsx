import { Search } from "lucide-react";

import { ChannelSection } from "@/components/channel/channel-section";
import { ChannelGrid } from "@/components/channel/channel-grid";
import { EmptyState } from "@/components/channel/empty-state";
import { Pagination } from "@/components/channel/pagination";
import { getCatalog, searchCatalog } from "@/lib/api/get-catalog";
import { isLiveNow } from "@/lib/epg";
import type { ApiChannelListItem } from "@/lib/api/serialize-channel";
import { slugify } from "@/lib/slug";
import { groupBy } from "@/lib/utils";

// EPG muda a cada poucos minutos — não cachear a homepage por muito
// tempo (PROJECT.md §53).
export const revalidate = 60;

const ALL_CHANNELS_PAGE_SIZE = 30;

/** Ordem de exibição sugerida em PROJECT.md §32, mapeada para os nomes reais das categorias. */
const PREFERRED_CATEGORY_ORDER = [
  "Canais Abertos",
  "Esportes",
  "Notícias",
  "Filmes e Séries",
  "Infantil",
  "Entretenimento",
  "Documentários",
];

function orderCategories(names: string[]): string[] {
  const preferred = PREFERRED_CATEGORY_ORDER.filter((name) => names.includes(name));
  const rest = names
    .filter((name) => !PREFERRED_CATEGORY_ORDER.includes(name))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return [...preferred, ...rest];
}

function isShowcaseReady(channel: ApiChannelListItem): boolean {
  return Boolean(channel.logo_url) && channel.embeds.length > 0;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  if (q) {
    const { items, total } = await searchCatalog(q);

    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">
          Resultados para &ldquo;{q}&rdquo;
        </h1>
        {items.length === 0 ? (
          <EmptyState
            icon={<Search className="size-8 text-muted-foreground" aria-hidden="true" />}
            title="Nenhum canal encontrado"
            description="Tente buscar por outro nome, categoria ou descrição."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "canal encontrado" : "canais encontrados"}.
            </p>
            <ChannelGrid channels={items} />
          </>
        )}
      </main>
    );
  }

  const catalog = await getCatalog();

  if (catalog.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <EmptyState
          title="Nenhum canal disponível no momento"
          description="Assim que a sincronização com o catálogo terminar, os canais aparecem aqui."
        />
      </main>
    );
  }

  const featured = catalog.filter(isShowcaseReady).slice(0, 10);
  const nowOnTv = catalog.filter((channel) => isLiveNow(channel.epg?.current)).slice(0, 18);

  // Agrupa uma vez (O(n)) em vez de filtrar o catálogo inteiro de
  // novo pra cada categoria (O(categorias × n)).
  const channelsByCategory = groupBy(catalog, (channel) => channel.category ?? "");
  const categoryNames = orderCategories([...channelsByCategory.keys()].filter(Boolean));

  const pageParam = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const pages = Math.max(1, Math.ceil(catalog.length / ALL_CHANNELS_PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageStart = (currentPage - 1) * ALL_CHANNELS_PAGE_SIZE;
  const allChannelsPage = catalog.slice(pageStart, pageStart + ALL_CHANNELS_PAGE_SIZE);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6">
      <ChannelSection title="Em destaque" channels={featured} />
      <ChannelSection title="Agora na TV" channels={nowOnTv} />

      {categoryNames.map((category) => (
        <ChannelSection
          key={category}
          title={category}
          categorySlug={slugify(category)}
          channels={channelsByCategory.get(category) ?? []}
        />
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Todos os canais</h2>
        <ChannelGrid channels={allChannelsPage} />
        <Pagination page={currentPage} pages={pages} basePath="/" />
      </section>
    </main>
  );
}
