import "server-only";

import { cache } from "react";

import { tmdbFetch } from "./client";
import {
  tmdbMovieDetailSchema,
  tmdbMovieListSchema,
  tmdbTvDetailSchema,
  tmdbTvListSchema,
  type TmdbMovieDetail,
  type TmdbMovieSummary,
  type TmdbTvDetail,
  type TmdbTvSummary,
} from "./schemas";

export interface TmdbPage<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}

function clampPage(page: number): number {
  return Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1;
}

export async function listMovies(
  page = 1,
  query = ""
): Promise<TmdbPage<TmdbMovieSummary>> {
  const safePage = clampPage(page);
  const response = query
    ? await tmdbFetch("search/movie", tmdbMovieListSchema, {
        page: safePage,
        query,
        include_adult: "false",
      })
    : await tmdbFetch("movie/popular", tmdbMovieListSchema, { page: safePage });

  return {
    items: response.results,
    page: response.page,
    pages: Math.min(response.total_pages, 500),
    total: response.total_results,
  };
}

export async function listTvShows(
  page = 1,
  query = ""
): Promise<TmdbPage<TmdbTvSummary>> {
  const safePage = clampPage(page);
  const response = query
    ? await tmdbFetch("search/tv", tmdbTvListSchema, {
        page: safePage,
        query,
        include_adult: "false",
      })
    : await tmdbFetch("tv/popular", tmdbTvListSchema, { page: safePage });

  return {
    items: response.results,
    page: response.page,
    pages: Math.min(response.total_pages, 500),
    total: response.total_results,
  };
}

export const getMovie = cache(async (tmdbId: number): Promise<TmdbMovieDetail> =>
  tmdbFetch(`movie/${tmdbId}`, tmdbMovieDetailSchema)
);

export const getTvShow = cache(async (tmdbId: number): Promise<TmdbTvDetail> =>
  tmdbFetch(`tv/${tmdbId}`, tmdbTvDetailSchema, { append_to_response: "external_ids" })
);

export function tmdbImage(path: string | null | undefined, size: "w500" | "original" = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

