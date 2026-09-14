"use client";

import { Heart } from "lucide-react";

import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(channelId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(channelId);
      }}
      aria-pressed={active}
      aria-label={
        active ? `Remover ${channelName} dos favoritos` : `Adicionar ${channelName} aos favoritos`
      }
      className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Heart
        className={cn("size-4", active && "fill-primary text-primary")}
        aria-hidden="true"
      />
    </button>
  );
}
