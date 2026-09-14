import type { z } from "zod";

import type { channelSchema, embedSchema, epgProgramSchema } from "./schemas";

export type UpstreamEmbed = z.infer<typeof embedSchema>;
export type UpstreamEpgProgram = z.infer<typeof epgProgramSchema>;
export type UpstreamChannel = z.infer<typeof channelSchema>;

export interface UpstreamChannelsResult {
  channels: UpstreamChannel[];
  total: number;
  invalidCount: number;
}

export type UpstreamHealthStatus = "healthy" | "degraded" | "unavailable";

export interface UpstreamHealthResult {
  status: UpstreamHealthStatus;
  checks: Record<string, boolean> | null;
}
