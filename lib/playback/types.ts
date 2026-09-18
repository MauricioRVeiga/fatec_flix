import { z } from "zod";

const tmdbIdSchema = z.number().int().positive().max(2_147_483_647);

export const playbackRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("movie"),
    tmdbId: tmdbIdSchema,
  }),
  z.object({
    type: z.literal("tv"),
    tmdbId: tmdbIdSchema,
    season: z.number().int().min(0).max(100),
    episode: z.number().int().min(1).max(1_000),
  }),
]);

export type PlaybackRequest = z.infer<typeof playbackRequestSchema>;

export interface PlaybackSource {
  provider: string;
  label: string;
  url: string;
}

export interface PlaybackProvider {
  key: string;
  label: string;
  resolve(request: PlaybackRequest): PlaybackSource | null;
}

