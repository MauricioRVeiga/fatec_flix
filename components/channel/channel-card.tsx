import { Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { calculateProgress, formatTime, isLiveNow } from "@/lib/epg";
import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { FavoriteButton } from "./favorite-button";

/**
 * Card do canal (PROJECT.md §33). Server Component — só o botão de
 * favorito é interativo (PROJECT.md §49).
 */
export function ChannelCard({ channel }: { channel: ApiChannelListItem }) {
  const current = channel.epg?.current ?? null;
  const live = isLiveNow(current);
  const progress = calculateProgress(current);
  const quality = channel.embeds[0]?.quality ?? null;

  return (
    <Link
      href={`/canal/${channel.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative flex aspect-video items-center justify-center bg-muted/30">
        {channel.logo_url ? (
          <Image
            src={channel.logo_url}
            alt={`Logo de ${channel.name}`}
            fill
            className="object-contain p-6"
            sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 50vw"
          />
        ) : (
          <Tv className="size-10 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="absolute right-2 top-2">
          <FavoriteButton channelId={channel.id} channelName={channel.name} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 font-medium leading-tight">{channel.name}</p>
        {channel.category && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{channel.category}</p>
        )}

        {current ? (
          <div className="mt-1.5 space-y-1">
            <p className="line-clamp-1 text-xs text-foreground/90">{current.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatTime(current.start_time)} → {formatTime(current.end_time)}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Programação não disponível.</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {live ? (
            <span className="flex items-center gap-1 text-xs font-medium text-red-500">
              <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
              AO VIVO
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          {quality && (
            <Badge variant="secondary" className="text-[10px]">
              {quality}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
