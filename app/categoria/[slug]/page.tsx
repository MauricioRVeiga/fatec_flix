import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChannelGrid } from "@/components/channel/channel-grid";
import { EmptyState } from "@/components/channel/empty-state";
import { Pagination } from "@/components/channel/pagination";
import { listCatalog, resolveCategoryBySlug } from "@/lib/api/get-catalog";

export const revalidate = 300;

const PAGE_SIZE = 30;

type CategoryPageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = await resolveCategoryBySlug(slug);

  if (!categoryName) {
    notFound();
  }

  return {
    title: `${categoryName} — Fatec Flix`,
    description: `Canais de ${categoryName} disponíveis no catálogo Fatec Flix.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<CategoryPageParams>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const categoryName = await resolveCategoryBySlug(slug);

  if (!categoryName) {
    notFound();
  }

  const { page: pageParam } = await searchParams;
  const rawPage = pageParam ? Number(pageParam) : 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const { items, total } = await listCatalog({
    category: categoryName,
    page,
    limit: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">{categoryName}</h1>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum canal nesta categoria no momento"
          description="Os canais podem ter saído do ar temporariamente ou mudado de categoria."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "canal" : "canais"}.
          </p>
          <ChannelGrid channels={items} />
          <Pagination page={page} pages={pages} basePath={`/categoria/${slug}`} />
        </>
      )}
    </main>
  );
}
