/**
 * Erros do cliente da API upstream (PROJECT.md §16–§19).
 *
 * Tipados para que quem chama `upstreamFetch` possa decidir o que fazer
 * (ex.: cair para os dados já sincronizados no Supabase) sem depender de
 * `instanceof Error` genérico.
 */

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** Timeout estourado (PROJECT.md §18 — 8 segundos sugeridos). */
export class UpstreamTimeoutError extends UpstreamError {
  constructor(path: string, timeoutMs: number) {
    super(`Upstream request to ${path} timed out after ${timeoutMs}ms`);
    this.name = "UpstreamTimeoutError";
  }
}

/** Status HTTP não-2xx retornado pelo upstream. */
export class UpstreamHttpError extends UpstreamError {
  constructor(
    public readonly path: string,
    public readonly status: number
  ) {
    super(`Upstream request to ${path} failed with status ${status}`);
    this.name = "UpstreamHttpError";
  }
}

/** Corpo da resposta não é JSON válido, ou Content-Type inesperado. */
export class UpstreamInvalidResponseError extends UpstreamError {
  constructor(path: string, reason: string) {
    super(`Upstream response from ${path} is invalid: ${reason}`);
    this.name = "UpstreamInvalidResponseError";
  }
}

/** JSON válido, mas não bate com o schema Zod esperado. */
export class UpstreamValidationError extends UpstreamError {
  constructor(
    path: string,
    public readonly issues: string
  ) {
    super(`Upstream response from ${path} failed schema validation: ${issues}`);
    this.name = "UpstreamValidationError";
  }
}
