import { describe, expect, it } from "vitest";

import { oneElevenMoviesProvider } from "@/lib/playback/providers/111movies";
import { playbackRequestSchema } from "@/lib/playback/types";

describe("111movies playback provider", () => {
  it("monta URL de filme com ID TMDB", () => {
    expect(oneElevenMoviesProvider.resolve({ type: "movie", tmdbId: 533535 })).toEqual({
      provider: "111movies",
      label: "111 Movies",
      url: "https://111movies.net/movie/533535",
    });
  });

  it("monta URL de episódio com temporada e episódio", () => {
    expect(
      oneElevenMoviesProvider.resolve({ type: "tv", tmdbId: 240411, season: 1, episode: 5 })
    ).toEqual({
      provider: "111movies",
      label: "111 Movies",
      url: "https://111movies.net/tv/240411/1/5",
    });
  });
});

describe("playbackRequestSchema", () => {
  it("rejeita IDs, temporadas e episódios fora dos limites", () => {
    expect(playbackRequestSchema.safeParse({ type: "movie", tmdbId: -1 }).success).toBe(false);
    expect(
      playbackRequestSchema.safeParse({ type: "tv", tmdbId: 1, season: 1, episode: 0 }).success
    ).toBe(false);
  });
});

