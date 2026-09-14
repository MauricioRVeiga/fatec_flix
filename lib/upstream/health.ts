import "server-only";

import { logger } from "@/lib/logger";
import { toErrorMessage } from "@/lib/utils";

import { upstreamFetch } from "./client";
import { upstreamHealthResponseSchema } from "./schemas";
import type { UpstreamHealthResult, UpstreamHealthStatus } from "./types";

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
      message: toErrorMessage(error),
    });

    return { status: "unavailable", checks: null };
  }
}

function normalizeStatus(status: string | undefined): UpstreamHealthStatus {
  if (status === "healthy" || status === "degraded" || status === "unavailable") {
    return status;
  }

  return "degraded";
}
