import "server-only";

/**
 * Rate limiting mínimo exigido para `/api/channels` (busca) e
 * `/api/cron/*` (PROJECT.md §59).
 *
 * LIMITAÇÃO CONHECIDA: em memória, por instância do processo. Numa
 * função serverless da Vercel com múltiplas instâncias, cada uma tem
 * seu próprio contador — o limite efetivo vira "N por instância", não
 * um limite global preciso. Isso ainda impede abuso trivial de um
 * único cliente martelando um endpoint, mas não é uma garantia
 * distribuída. Antes de produção com tráfego real, trocar por um
 * store durável e compartilhado (ex.: Upstash Redis / Vercel KV).
 */

interface Bucket {
  count: number;
  windowStartedAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Evita crescimento ilimitado do Map (identificadores que nunca mais
 * voltam ficariam presos em memória pra sempre). Sem timer/cron: só
 * varre e descarta entradas expiradas de tempos em tempos, disparado
 * pelas próprias chamadas de `checkRateLimit`.
 */
const SWEEP_EVERY_N_CALLS = 500;
const MAX_BUCKET_AGE_MS = 10 * 60 * 1000;
let callsSinceSweep = 0;

function sweepExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= MAX_BUCKET_AGE_MS) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Identifica o endpoint (evita que limites de rotas diferentes se misturem). */
  scope: string;
  /** Requisições permitidas por janela. */
  limit: number;
  windowMs: number;
  /** Identifica o chamador — normalmente o IP. */
  identifier: string;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { scope, limit, windowMs, identifier } = options;
  const key = `${scope}:${identifier}`;
  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_EVERY_N_CALLS) {
    callsSinceSweep = 0;
    sweepExpiredBuckets(now);
  }

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterMs = windowMs - (now - bucket.windowStartedAt);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, limit, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/**
 * Extrai um identificador de cliente a partir dos headers de proxy.
 *
 * IMPORTANTE: `X-Forwarded-For` é uma lista que qualquer cliente pode
 * mandar pré-preenchida (`X-Forwarded-For: 1.1.1.1, 2.2.2.2, ...`) —
 * usar a *primeira* entrada deixaria o rate limit inteiro contornável
 * só trocando esse header a cada request. A Vercel (nosso alvo de
 * deploy, PROJECT.md §71) *acrescenta* o IP real do cliente como a
 * *última* entrada da lista, então usamos essa. `x-real-ip`, quando
 * presente, é um valor único setado pelo próprio proxy de borda (não
 * uma lista que o cliente possa prefixar), por isso tem prioridade
 * quando disponível.
 *
 * Ainda assim, isto é best-effort para agrupar por IP num rate limit,
 * não uma fonte de identidade confiável para autenticação.
 */
export function getClientIdentifier(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const entries = forwardedFor.split(",").map((entry) => entry.trim());
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      return lastEntry;
    }
  }

  return "unknown";
}
