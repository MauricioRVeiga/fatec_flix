import { NextResponse } from "next/server";
import { z } from "zod";

import { serializeChannelDetail } from "@/lib/api/serialize-channel";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createChannelRepository } from "@/lib/repositories/channel-repository";
import { createEmbedRepository } from "@/lib/repositories/embed-repository";
import { createEpgRepository } from "@/lib/repositories/epg-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

const idSchema = z.string().trim().min(1).max(200);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identifier = getClientIdentifier(request.headers);
  const rateLimit = checkRateLimit({
    scope: "api_channel_detail",
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

  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse(rawId);

  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
  }

  const id = parsedId.data;

  try {
    const client = createServerSupabaseClient();
    const channelRepo = createChannelRepository(client);
    const embedRepo = createEmbedRepository(client);
    const epgRepo = createEpgRepository(client);

    const channel = await channelRepo.getActiveById(id);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const [embeds, epg] = await Promise.all([
      embedRepo.listActiveByChannelId(id),
      epgRepo.getByChannelId(id),
    ]);

    return NextResponse.json(serializeChannelDetail(channel, embeds, epg));
  } catch (error) {
    logger.error("api_channel_detail_error", {
      channel_id: id,
      message: toErrorMessage(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
