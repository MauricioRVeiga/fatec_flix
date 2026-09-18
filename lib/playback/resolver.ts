import "server-only";

import { features } from "@/config/features";

import { oneElevenMoviesProvider } from "./providers/111movies";
import type { PlaybackRequest, PlaybackSource } from "./types";

export function resolvePlayback(request: PlaybackRequest): PlaybackSource[] {
  if (!features.vod) return [];

  const providers = [
    ...(features.oneElevenMovies ? [oneElevenMoviesProvider] : []),
  ];

  return providers.flatMap((provider) => {
    const source = provider.resolve(request);
    return source ? [source] : [];
  });
}

