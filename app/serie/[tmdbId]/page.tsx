import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MediaDetail } from "@/components/media/media-detail";
import { MediaPlayer } from "@/components/media/media-player";
import { features } from "@/config/features";
import { TmdbRequestError } from "@/lib/tmdb/client";
import { getTvShow } from "@/lib/tmdb/media";

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
  if (!features.vod) return { title: "Série não disponível" };
  const id = parseTmdbId((await params).tmdbId);
  if (!id) return { title: "Série não encontrada" };

  try {
    const show = await getTvShow(id);
    return { title: `${show.name} — Fatec Flix`, description: show.overview };
  } catch {
    return { title: "Série — Fatec Flix" };
  }
}

export default async function TvShowPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  if (!features.vod) notFound();
  const tmdbId = parseTmdbId((await params).tmdbId);
  if (!tmdbId) notFound();

  let show;
  try {
    show = await getTvShow(tmdbId);
  } catch (error) {
    if (error instanceof TmdbRequestError && error.status === 404) notFound();
    throw error;
  }

  const runtime = show.episode_run_time[0];
  const duration = runtime ? `${runtime} min por episódio` : null;
  const seasons = show.seasons.map((season) => ({
    seasonNumber: season.season_number,
    name: season.name,
    episodeCount: season.episode_count,
  }));

  return (
    <MediaDetail
      title={show.name}
      tagline={show.tagline}
      overview={show.overview}
      posterPath={show.poster_path}
      backdropPath={show.backdrop_path}
      releaseDate={show.first_air_date}
      voteAverage={show.vote_average}
      durationLabel={duration}
      genres={show.genres.map((genre) => genre.name)}
      player={
        <MediaPlayer title={show.name} tmdbId={show.id} type="tv" seasons={seasons} />
      }
    />
  );
}

