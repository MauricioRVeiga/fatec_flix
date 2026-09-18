import { describe, expect, it } from "vitest";

import { tmdbMovieListSchema, tmdbTvDetailSchema } from "@/lib/tmdb/schemas";

describe("TMDB schemas", () => {
  it("normaliza campos opcionais da listagem de filmes", () => {
    const parsed = tmdbMovieListSchema.parse({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [{ id: 10, title: "Filme" }],
    });

    expect(parsed.results[0]).toMatchObject({
      id: 10,
      title: "Filme",
      overview: "",
      poster_path: null,
      genre_ids: [],
    });
  });

  it("aceita detalhes de série e suas temporadas", () => {
    const result = tmdbTvDetailSchema.safeParse({
      id: 20,
      name: "Série",
      seasons: [{ id: 30, season_number: 1, name: "Temporada 1", episode_count: 8 }],
    });

    expect(result.success).toBe(true);
  });
});

