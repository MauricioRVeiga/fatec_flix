import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/api/verify-cron-secret";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { syncChannels } from "@/services/sync-channels";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCronSync(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    logger.warn("cron_sync_unauthorized", { identifier: getClientIdentifier(request.headers) });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identifier = getClientIdentifier(request.headers);
  const rateLimit = checkRateLimit({
    scope: "api_cron_sync_channels",
    limit: 6,
    windowMs: 60_000,
    identifier,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const result = await syncChannels();

  if (result.status === "skipped") {
    return NextResponse.json(result, { status: 409 });
  }

  if (result.status === "failed") {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function GET(request: Request) {
  return handleCronSync(request);
}

export async function POST(request: Request) {
  return handleCronSync(request);
}
