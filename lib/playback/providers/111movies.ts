import type { PlaybackProvider, PlaybackRequest, PlaybackSource } from "../types";

const BASE_URL = "https://111movies.net";

export const oneElevenMoviesProvider: PlaybackProvider = {
  key: "111movies",
  label: "111 Movies",
  resolve(request: PlaybackRequest): PlaybackSource {
    const path =
      request.type === "movie"
        ? `/movie/${request.tmdbId}`
        : `/tv/${request.tmdbId}/${request.season}/${request.episode}`;

    return {
      provider: this.key,
      label: this.label,
      url: new URL(path, BASE_URL).toString(),
    };
  },
};

