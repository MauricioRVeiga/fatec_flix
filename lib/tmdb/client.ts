import "server-only";

import type { ZodType } from "zod";

import { logger } from "@/lib/logger";

const TMDB_API_URL = "https://api.themoviedb.org/3/";
const TMDB_TIMEOUT_MS = 8_000;

export class TmdbConfigurationError extends Error {
  constructor() {
    super("TMDB_READ_ACCESS_TOKEN não configurado");
    this.name = "TmdbConfigurationError";
  }
}

export class TmdbRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TmdbRequestError";
  }
}

export async function tmdbFetch<T>(
  path: string,
  schema: ZodType<T>,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3_600
): Promise<T> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new TmdbConfigurationError();

  const url = new URL(path.replace(/^\//, ""), TMDB_API_URL);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      next: { revalidate },
    });

    if (!response.ok) {
      throw new TmdbRequestError(`TMDB respondeu com status ${response.status}`, response.status);
    }

    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      logger.error("tmdb_validation_error", {
        path,
        issues: parsed.error.message,
      });
      throw new TmdbRequestError("Resposta inválida recebida do TMDB");
    }

    logger.info("tmdb_fetch", {
      path,
      duration_ms: Date.now() - startedAt,
    });
    return parsed.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TmdbRequestError("Tempo limite excedido ao consultar o TMDB");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

