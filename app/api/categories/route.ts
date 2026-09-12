import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createCategoryRepository } from "@/lib/repositories/category-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Catálogo de canais muda pouco durante o dia (sincroniza a cada
// poucos minutos) — cache mais longo que EPG/canais individuais
// (PROJECT.md §53).
export const revalidate = 300;

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request);
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
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
