import { z } from "zod";

const nullablePath = z.string().nullable().optional().default(null);
const nullableDate = z.string().nullable().optional().default(null);

export const tmdbMovieSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  original_title: z.string().optional().default(""),
  overview: z.string().optional().default(""),
  poster_path: nullablePath,
  backdrop_path: nullablePath,
  release_date: nullableDate,
  vote_average: z.number().optional().default(0),
  popularity: z.number().optional().default(0),
  genre_ids: z.array(z.number().int()).optional().default([]),
});

export const tmdbTvSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  original_name: z.string().optional().default(""),
  overview: z.string().optional().default(""),
  poster_path: nullablePath,
  backdrop_path: nullablePath,
  first_air_date: nullableDate,
  vote_average: z.number().optional().default(0),
  popularity: z.number().optional().default(0),
  genre_ids: z.array(z.number().int()).optional().default([]),
});

export const tmdbMovieListSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
});

export const tmdbTvListSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(tmdbTvSummarySchema),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
});

const genreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export const tmdbMovieDetailSchema = tmdbMovieSummarySchema.omit({ genre_ids: true }).extend({
  imdb_id: z.string().nullable().optional().default(null),
  tagline: z.string().optional().default(""),
  runtime: z.number().int().nonnegative().nullable().optional().default(null),
  genres: z.array(genreSchema).optional().default([]),
});

const seasonSchema = z.object({
  id: z.number().int().positive(),
  season_number: z.number().int().nonnegative(),
  name: z.string(),
  overview: z.string().optional().default(""),
  poster_path: nullablePath,
  episode_count: z.number().int().nonnegative().optional().default(0),
  air_date: nullableDate,
});

export const tmdbTvDetailSchema = tmdbTvSummarySchema.omit({ genre_ids: true }).extend({
  external_ids: z
    .object({ imdb_id: z.string().nullable().optional().default(null) })
    .optional()
    .default({ imdb_id: null }),
  tagline: z.string().optional().default(""),
  episode_run_time: z.array(z.number().int().nonnegative()).optional().default([]),
  number_of_seasons: z.number().int().nonnegative().optional().default(0),
  number_of_episodes: z.number().int().nonnegative().optional().default(0),
  genres: z.array(genreSchema).optional().default([]),
  seasons: z.array(seasonSchema).optional().default([]),
});

export type TmdbMovieSummary = z.infer<typeof tmdbMovieSummarySchema>;
export type TmdbTvSummary = z.infer<typeof tmdbTvSummarySchema>;
export type TmdbMovieDetail = z.infer<typeof tmdbMovieDetailSchema>;
export type TmdbTvDetail = z.infer<typeof tmdbTvDetailSchema>;

