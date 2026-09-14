import { Tv } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { AdblockNotice } from "@/components/channel/adblock-notice";
import { ChannelEpg } from "@/components/channel/channel-epg";
import { ChannelGrid } from "@/components/channel/channel-grid";
import { ChannelPlayer } from "@/components/channel/channel-player";
import { features } from "@/config/features";
import { getChannelDetail, getRelatedChannels } from "@/lib/api/get-catalog";

export const revalidate = 60;

type ChannelPageParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<ChannelPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getChannelDetail(id);

  if (!detail) {
    notFound();
  }

  return {
    title: `Assistir ${detail.channel.name} — programação`,
    description: `Confira programação atual e próximos programas de ${detail.channel.name}.`,
  };
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<ChannelPageParams>;
}) {
  const { id } = await params;
  const detail = await getChannelDetail(id);

  if (!detail) {
    notFound();
  }

  const { channel, embeds, epg } = detail;
  const related = await getRelatedChannels(channel.category, channel.id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4">
        {features.externalEmbeds && embeds.length > 0 ? (
          <>
            <AdblockNotice />
            <ChannelPlayer channelName={channel.name} embeds={embeds} />
          </>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-black text-center">
            <p className="px-6 text-sm text-muted-foreground">
              {embeds.length === 0
                ? "Nenhum servidor disponível para este canal no momento."
                : "Exibição externa desabilitada."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          {channel.logo_url ? (
            <Image
              src={channel.logo_url}
              alt={`Logo de ${channel.name}`}
              width={80}
              height={80}
              className="object-contain p-2"
            />
          ) : (
            <Tv className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{channel.name}</h1>
            {channel.category && <Badge variant="secondary">{channel.category}</Badge>}
          </div>

          {channel.description && (
            <p className="text-sm text-muted-foreground">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/60 p-4">
        <ChannelEpg epg={epg} />
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Outros canais relacionados</h2>
          <ChannelGrid channels={related} />
        </section>
      )}
    </main>
  );
}
