import { Search, Tv } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/channel/empty-state";
import { Pagination } from "@/components/channel/pagination";
import { MediaGrid } from "@/components/media/media-grid";
import { features } from "@/config/features";
import { listTvShows } from "@/lib/tmdb/media";

export const metadata: Metadata = {
  title: "Séries — Fatec Flix",
  description: "Descubra séries e escolha episódios para assistir.",
};

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!features.vod) notFound();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await listTvShows(page, query);
  const items = result.items.map((show) => ({
    id: show.id,
    type: "tv" as const,
    title: show.name,
    overview: show.overview,
    posterPath: show.poster_path,
    releaseDate: show.first_air_date,
    voteAverage: show.vote_average,
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Catálogo</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Tv className="size-6" aria-hidden="true" />
          {query ? `Séries encontradas para “${query}”` : "Séries populares"}
        </h1>
      </div>

      {items.length > 0 ? (
        <>
          <MediaGrid items={items} />
          <Pagination
            page={result.page}
            pages={result.pages}
            basePath={query ? `/series?q=${encodeURIComponent(query)}` : "/series"}
          />
        </>
      ) : (
        <EmptyState
          icon={<Search className="size-8 text-muted-foreground" aria-hidden="true" />}
          title="Nenhuma série encontrada"
          description="Tente buscar por outro título."
        />
      )}
    </main>
  );
}

