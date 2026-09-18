import { CalendarDays, Clock3, Star } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { tmdbImage } from "@/lib/tmdb/media";

export function MediaDetail({
  title,
  tagline,
  overview,
  posterPath,
  backdropPath,
  releaseDate,
  voteAverage,
  durationLabel,
  genres,
  player,
}: {
  title: string;
  tagline: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  durationLabel: string | null;
  genres: string[];
  player: ReactNode;
}) {
  const posterUrl = tmdbImage(posterPath);
  const backdropUrl = tmdbImage(backdropPath, "original");
  const year = releaseDate?.slice(0, 4);

  return (
    <main className="relative flex-1 overflow-hidden">
      {backdropUrl && (
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] opacity-25">
          <Image src={backdropUrl} alt="" fill priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/75 to-background" />
        </div>
      )}

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="relative mx-auto aspect-[2/3] max-w-60 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xl lg:mx-0">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={`Pôster de ${title}`}
                fill
                priority
                className="object-cover"
                sizes="240px"
              />
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 space-y-7">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {tagline && <p className="text-lg italic text-muted-foreground">{tagline}</p>}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {year && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" /> {year}
                </span>
              )}
              {durationLabel && (
                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-4" aria-hidden="true" /> {durationLabel}
                </span>
              )}
              {voteAverage > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-current" aria-hidden="true" />
                  {voteAverage.toFixed(1)}
                </span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
              </div>
            )}
          </header>

          {overview && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Sinopse</h2>
              <p className="max-w-3xl leading-relaxed text-muted-foreground">{overview}</p>
            </section>
          )}

          {player}

          <footer className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
            Dados e imagens fornecidos por TMDB. Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
          </footer>
        </div>
      </div>
    </main>
  );
}

