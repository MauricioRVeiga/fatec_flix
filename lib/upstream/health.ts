import "server-only";

import { logger } from "@/lib/logger";

import { upstreamFetch } from "./client";
import { upstreamHealthResponseSchema } from "./schemas";
import type { UpstreamHealthResult, UpstreamHealthStatus } from "./types";

/**
 * Consulta `GET /health` no upstream e normaliza o resultado.
 *
 * `success: true` não significa `status: healthy` (PROJECT.md §27) —
 * os dois campos são tratados separadamente. Diferente de
 * `getUpstreamChannels`, esta função nunca lança: uma falha ao
 * checar a saúde do upstream é, ela mesma, um resultado válido
 * ("unavailable"), já que quem chama (ex.: nosso `/api/health`)
 * precisa continuar respondendo mesmo com o upstream fora do ar.
 */
export async function getUpstreamHealth(): Promise<UpstreamHealthResult> {
  try {
    const response = await upstreamFetch("/health", upstreamHealthResponseSchema);

    if (!response.success) {
      return { status: "unavailable", checks: response.checks ?? null };
    }

    const status = normalizeStatus(response.status);

    return { status, checks: response.checks ?? null };
  } catch (error) {
    logger.warn("upstream_health_unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });

    return { status: "unavailable", checks: null };
  }
}

function normalizeStatus(status: string | undefined): UpstreamHealthStatus {
  if (status === "healthy" || status === "degraded" || status === "unavailable") {
    return status;
  }

  // Campo de status ausente ou com valor desconhecido, mas
  // `success: true`: trata como degraded em vez de assumir saudável
  // sem confirmação.
  return "degraded";
}
