import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MediaDetail } from "@/components/media/media-detail";
import { MediaPlayer } from "@/components/media/media-player";
import { features } from "@/config/features";
import { TmdbRequestError } from "@/lib/tmdb/client";
import { getMovie } from "@/lib/tmdb/media";

function parseTmdbId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}): Promise<Metadata> {
  if (!features.vod) return { title: "Filme não disponível" };
  const id = parseTmdbId((await params).tmdbId);
  if (!id) return { title: "Filme não encontrado" };

  try {
    const movie = await getMovie(id);
    return { title: `${movie.title} — Fatec Flix`, description: movie.overview };
  } catch {
    return { title: "Filme — Fatec Flix" };
  }
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  if (!features.vod) notFound();
  const tmdbId = parseTmdbId((await params).tmdbId);
  if (!tmdbId) notFound();

  let movie;
  try {
    movie = await getMovie(tmdbId);
  } catch (error) {
    if (error instanceof TmdbRequestError && error.status === 404) notFound();
    throw error;
  }

  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const minutes = movie.runtime ? movie.runtime % 60 : 0;
  const duration = movie.runtime
    ? `${hours > 0 ? `${hours}h ` : ""}${minutes}min`
    : null;

  return (
    <MediaDetail
      title={movie.title}
      tagline={movie.tagline}
      overview={movie.overview}
      posterPath={movie.poster_path}
      backdropPath={movie.backdrop_path}
      releaseDate={movie.release_date}
      voteAverage={movie.vote_average}
      durationLabel={duration}
      genres={movie.genres.map((genre) => genre.name)}
      player={<MediaPlayer title={movie.title} tmdbId={movie.id} type="movie" />}
    />
  );
}

