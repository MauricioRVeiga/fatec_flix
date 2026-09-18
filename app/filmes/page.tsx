import { Film, Search } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/channel/empty-state";
import { Pagination } from "@/components/channel/pagination";
import { MediaGrid } from "@/components/media/media-grid";
import { features } from "@/config/features";
import { listMovies } from "@/lib/tmdb/media";

export const metadata: Metadata = {
  title: "Filmes — Fatec Flix",
  description: "Descubra filmes e escolha o que assistir.",
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!features.vod) notFound();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await listMovies(page, query);
  const items = result.items.map((movie) => ({
    id: movie.id,
    type: "movie" as const,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Catálogo</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Film className="size-6" aria-hidden="true" />
          {query ? `Filmes encontrados para “${query}”` : "Filmes populares"}
        </h1>
      </div>

      {items.length > 0 ? (
        <>
          <MediaGrid items={items} />
          <Pagination
            page={result.page}
            pages={result.pages}
            basePath={query ? `/filmes?q=${encodeURIComponent(query)}` : "/filmes"}
          />
        </>
      ) : (
        <EmptyState
          icon={<Search className="size-8 text-muted-foreground" aria-hidden="true" />}
          title="Nenhum filme encontrado"
          description="Tente buscar por outro título."
        />
      )}
    </main>
  );
}

