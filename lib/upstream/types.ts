import type { z } from "zod";

import type { channelSchema, embedSchema, epgProgramSchema } from "./schemas";

/**
 * Tipos inferidos a partir dos schemas Zod — representam o shape
 * validado vindo do upstream. Não confundir com o domínio da
 * aplicação (Channel, ChannelEmbed, ChannelEpg em types/database.ts):
 * o normalizer, na Fase 4, converte `UpstreamChannel` para o domínio
 * (PROJECT.md §77). Componentes/UI nunca devem depender destes tipos
 * diretamente.
 */

export type UpstreamEmbed = z.infer<typeof embedSchema>;
export type UpstreamEpgProgram = z.infer<typeof epgProgramSchema>;
export type UpstreamChannel = z.infer<typeof channelSchema>;

export interface UpstreamChannelsResult {
  channels: UpstreamChannel[];
  total: number;
  /** Canais que vieram na resposta mas falharam a validação Zod. */
  invalidCount: number;
}

export type UpstreamHealthStatus = "healthy" | "degraded" | "unavailable";

export interface UpstreamHealthResult {
  status: UpstreamHealthStatus;
  checks: Record<string, boolean> | null;
}
