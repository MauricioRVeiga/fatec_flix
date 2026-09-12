import "server-only";

import type { ZodType } from "zod";

import { logger } from "@/lib/logger";

import {
  UpstreamHttpError,
  UpstreamInvalidResponseError,
  UpstreamTimeoutError,
  UpstreamValidationError,
} from "./errors";

/**
 * Única fonte da URL do upstream (PROJECT.md §17). Nunca espalhar
 * "https://api.reidoscanais.st" pelo código — sempre importar daqui.
 */
export const UPSTREAM_API_URL = process.env.UPSTREAM_API_URL;

const TIMEOUT_MS = 8_000;
/** Tentativas adicionais após a primeira (PROJECT.md §18). */
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

const USER_AGENT = "FatecFlix-Sync/1.0 (+https://github.com)";

function isRetryableStatus(status: number): boolean {
  // Nunca retry indiscriminado em 4xx (PROJECT.md §18) — só erros do
  // lado do servidor upstream ou rate limit merecem nova tentativa.
  return status >= 500 || status === 429;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Faz uma requisição para a API upstream com timeout, retries com
 * backoff, validação de status/JSON/Content-Type e validação Zod do
 * corpo da resposta (PROJECT.md §18–§19).
 *
 * Diferente da assinatura literal do §18, recebe também o `schema`
 * Zod esperado — assim a validação acontece sempre, dentro da mesma
 * função, em vez de ficar responsabilidade de cada chamador lembrar
 * de aplicar.
 */
export async function upstreamFetch<T>(
  path: string,
  schema: ZodType<T>,
  options?: RequestInit
): Promise<T> {
  if (!UPSTREAM_API_URL) {
    throw new UpstreamInvalidResponseError(path, "UPSTREAM_API_URL não configurada");
  }

  const url = new URL(path, UPSTREAM_API_URL).toString();

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const httpError = new UpstreamHttpError(path, response.status);

        if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
          throw httpError;
        }

        logger.warn("upstream_fetch_retry", {
          path,
          status: response.status,
          attempt,
        });
        lastError = httpError;
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new UpstreamInvalidResponseError(
          path,
          `unexpected content-type "${contentType}"`
        );
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new UpstreamInvalidResponseError(path, "response body is not valid JSON");
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new UpstreamValidationError(path, parsed.error.message);
      }

      logger.info("upstream_fetch", {
        path,
        status: response.status,
        duration_ms: Date.now() - startedAt,
        attempt,
      });

      return parsed.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutError = new UpstreamTimeoutError(path, TIMEOUT_MS);

        if (attempt === MAX_RETRIES) {
          logger.error("upstream_fetch_error", { path, reason: "timeout", attempt });
          throw timeoutError;
        }

        logger.warn("upstream_fetch_retry", { path, reason: "timeout", attempt });
        lastError = timeoutError;
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }

      // Erros que não devem ser retentados: HTTP não-retryable, JSON
      // inválido, Content-Type inesperado, falha de validação Zod.
      if (
        error instanceof UpstreamHttpError ||
        error instanceof UpstreamInvalidResponseError ||
        error instanceof UpstreamValidationError
      ) {
        logger.error("upstream_fetch_error", {
          path,
          reason: error.name,
          message: error.message,
        });
        throw error;
      }

      // Erro de rede genérico (DNS, conexão recusada, etc.) — pode
      // valer a pena tentar de novo.
      if (attempt === MAX_RETRIES) {
        logger.error("upstream_fetch_error", {
          path,
          reason: "network_error",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      logger.warn("upstream_fetch_retry", { path, reason: "network_error", attempt });
      lastError = error;
      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  // Inalcançável na prática (o loop sempre retorna ou lança antes),
  // mas satisfaz o TypeScript e evita undefined behavior silencioso.
  throw lastError instanceof Error
    ? lastError
    : new UpstreamInvalidResponseError(path, "unknown error");
}
