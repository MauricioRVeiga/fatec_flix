import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createCategoryRepository } from "@/lib/repositories/category-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/utils";

export const revalidate = 300;

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request.headers);
  const rateLimit = checkRateLimit({
    scope: "api_categories",
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

  try {
    const client = createServerSupabaseClient();
    const categoryRepo = createCategoryRepository(client);

    const categories = await categoryRepo.listWithCounts();

    return NextResponse.json(categories);
  } catch (error) {
    logger.error("api_categories_error", {
      message: toErrorMessage(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
