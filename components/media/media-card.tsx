import { Film, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { tmdbImage } from "@/lib/tmdb/media";

export interface MediaCardItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

export function MediaCard({ item, priority = false }: { item: MediaCardItem; priority?: boolean }) {
  const imageUrl = tmdbImage(item.posterPath);
  const year = item.releaseDate?.slice(0, 4);
  const href = item.type === "movie" ? `/filme/${item.id}` : `/serie/${item.id}`;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-lg border border-border/60 bg-card transition hover:-translate-y-0.5 hover:border-border hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted/30">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Pôster de ${item.title}`}
            fill
            priority={priority}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1280px) 180px, (min-width: 768px) 20vw, 40vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Film className="size-12 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h2 className="line-clamp-1 font-medium leading-tight">{item.title}</h2>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{year || "Data indisponível"}</span>
          {item.voteAverage > 0 && (
            <span className="flex items-center gap-1" aria-label={`Nota ${item.voteAverage.toFixed(1)}`}>
              <Star className="size-3 fill-current" aria-hidden="true" />
              {item.voteAverage.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

