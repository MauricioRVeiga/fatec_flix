import { NextResponse } from "next/server";
import { z } from "zod";

import { listCatalog } from "@/lib/api/get-catalog";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { toErrorMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request.headers);
  const rateLimit = checkRateLimit({
    scope: "api_channels",
    limit: 60,
    windowMs: 60_000,
    identifier,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  for (const key of ["category", "q", "page", "limit"]) {
    const value = url.searchParams.get(key);
    if (value !== null) {
      rawParams[key] = value;
    }
  }

  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { category, q, page, limit } = parsed.data;

  try {
    const { items, total } = await listCatalog({ category, q, page, limit });

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error("api_channels_error", {
      message: toErrorMessage(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
