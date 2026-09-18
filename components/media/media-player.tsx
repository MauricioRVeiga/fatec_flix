"use client";

import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { PlaybackRequest, PlaybackSource } from "@/lib/playback/types";

interface TvSeasonOption {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

function isAllowedPlaybackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "111movies.net";
  } catch {
    return false;
  }
}

export function MediaPlayer({
  title,
  tmdbId,
  type,
  seasons = [],
}: {
  title: string;
  tmdbId: number;
  type: "movie" | "tv";
  seasons?: TvSeasonOption[];
}) {
  const firstSeason = seasons.find((season) => season.seasonNumber > 0 && season.episodeCount > 0);
  const [seasonNumber, setSeasonNumber] = useState(firstSeason?.seasonNumber ?? 1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedSeason = seasons.find((season) => season.seasonNumber === seasonNumber);
  const episodeCount = selectedSeason?.episodeCount ?? 1;

  async function startPlayback() {
    setLoading(true);
    setError(null);

    const payload: PlaybackRequest =
      type === "movie"
        ? { type, tmdbId }
        : { type, tmdbId, season: seasonNumber, episode: episodeNumber };

    try {
      const response = await fetch("/api/playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        sources?: PlaybackSource[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Não foi possível iniciar o player.");

      const nextSource = data.sources?.find((item) => isAllowedPlaybackUrl(item.url));
      if (!nextSource) throw new Error("O provedor retornou uma URL inválida.");
      setSource(nextSource);
    } catch (playbackError) {
      setSource(null);
      setError(
        playbackError instanceof Error
          ? playbackError.message
          : "Não foi possível iniciar o player."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeSeason(value: number) {
    setSeasonNumber(value);
    setEpisodeNumber(1);
    setSource(null);
    setError(null);
  }

  function changeEpisode(value: number) {
    setEpisodeNumber(value);
    setSource(null);
    setError(null);
  }

  return (
    <section className="space-y-3" aria-label={`Reprodução de ${title}`}>
      {type === "tv" && seasons.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Temporada</span>
            <select
              value={seasonNumber}
              onChange={(event) => changeSeason(Number(event.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3"
            >
              {seasons
                .filter((season) => season.seasonNumber > 0 && season.episodeCount > 0)
                .map((season) => (
                  <option key={season.seasonNumber} value={season.seasonNumber}>
                    {season.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Episódio</span>
            <select
              value={episodeNumber}
              onChange={(event) => changeEpisode(Number(event.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3"
            >
              {Array.from({ length: episodeCount }, (_, index) => index + 1).map((episode) => (
                <option key={episode} value={episode}>
                  Episódio {episode}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-black">
        {source ? (
          <iframe
            key={source.url}
            src={source.url}
            title={`${title} — ${source.label}`}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            referrerPolicy="no-referrer"
            allowFullScreen
            className="size-full"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
            {error ? (
              <>
                <AlertTriangle className="size-10 text-amber-400" aria-hidden="true" />
                <p className="max-w-md text-sm text-white/80">{error}</p>
                <Button type="button" variant="secondary" onClick={startPlayback} disabled={loading}>
                  <RotateCcw aria-hidden="true" /> Tentar novamente
                </Button>
              </>
            ) : (
              <>
                <Play className="size-12" aria-hidden="true" />
                <div>
                  <p className="font-medium">Pronto para assistir?</p>
                  <p className="mt-1 text-xs text-white/60">
                    O player externo só será carregado depois do seu clique.
                  </p>
                </div>
                <Button type="button" onClick={startPlayback} disabled={loading}>
                  <Play aria-hidden="true" /> {loading ? "Preparando..." : "Assistir agora"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {source && (
        <p className="text-xs text-muted-foreground">
          Reprodução fornecida por {source.label}. Conteúdo e disponibilidade são responsabilidade do provedor externo.
        </p>
      )}
    </section>
  );
}

