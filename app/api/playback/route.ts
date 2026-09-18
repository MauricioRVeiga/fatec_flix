import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { resolvePlayback } from "@/lib/playback/resolver";
import { playbackRequestSchema } from "@/lib/playback/types";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    scope: "api_playback",
    limit: 30,
    windowMs: 60_000,
    identifier: getClientIdentifier(request.headers),
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um instante." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const parsed = playbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros de reprodução inválidos." }, { status: 400 });
  }

  const sources = resolvePlayback(parsed.data);
  logger.info("playback_resolved", {
    type: parsed.data.type,
    tmdb_id: parsed.data.tmdbId,
    providers: sources.map((source) => source.provider),
  });

  if (sources.length === 0) {
    return NextResponse.json(
      { error: "Nenhum provedor de reprodução está habilitado." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { sources },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

