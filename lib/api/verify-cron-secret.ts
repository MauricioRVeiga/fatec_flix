import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Valida `Authorization: Bearer <CRON_SECRET>` (PROJECT.md §24).
 *
 * Fail closed: se `CRON_SECRET` não estiver configurado, nenhuma
 * requisição é aceita — nunca abre o endpoint por acidente por falta
 * de configuração (SECURITY.md — deny by default).
 *
 * Comparação em tempo constante para não vazar o segredo por timing
 * (SECURITY.md — Cryptographic Failures / Authentication Failures).
 * Compara hashes de tamanho fixo (SHA-256) em vez dos valores crus:
 * um `if (a.length !== b.length) return false` antes do
 * `timingSafeEqual` — como se faria comparando os buffers direto —
 * já seria, ele mesmo, um canal lateral de tempo (dá pra medir o
 * tamanho do segredo antes da comparação de conteúdo rodar). Hashear
 * os dois lados sempre produz o mesmo tamanho, eliminando esse branch.
 */
export function verifyCronSecret(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const providedSecret = header.slice("Bearer ".length);

  const expectedHash = createHash("sha256").update(configuredSecret).digest();
  const providedHash = createHash("sha256").update(providedSecret).digest();

  return timingSafeEqual(expectedHash, providedHash);
}
