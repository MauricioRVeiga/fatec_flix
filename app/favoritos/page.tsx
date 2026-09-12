"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { ChannelGridSkeleton } from "@/components/channel/channel-card-skeleton";
import { ChannelGrid } from "@/components/channel/channel-grid";
import { EmptyState } from "@/components/channel/empty-state";
import { useFavorites } from "@/hooks/use-favorites";
import type { ApiChannelDetail, ApiChannelListItem } from "@/lib/api/serialize-channel";

/**
 * Favoritos vivem só no localStorage (PROJECT.md §13/§44) — por isso
 * esta página é Client Component: não dá pra saber os favoritos no
 * servidor. Busca os detalhes de cada canal favoritado na nossa
 * própria API pública (`/api/channels/[id]`).
 */
export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [channels, setChannels] = useState<ApiChannelListItem[] | null>(null);

  useEffect(() => {
    // Nada pra buscar — o branch de renderização abaixo já cobre o
    // caso vazio direto a partir de `favorites`, sem precisar setar
    // estado aqui.
    if (favorites.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.all(
      favorites.map(async (id): Promise<ApiChannelListItem | null> => {
        try {
          const response = await fetch(`/api/channels/${encodeURIComponent(id)}`);
          if (!response.ok) {
            return null;
          }

          const detail = (await response.json()) as ApiChannelDetail;
          return { ...detail.channel, embeds: detail.embeds, epg: detail.epg };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!cancelled) {
        setChannels(results.filter((channel): channel is ApiChannelListItem => channel !== null));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [favorites]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">Favoritos</h1>

      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-8 text-muted-foreground" aria-hidden="true" />}
          title="Você ainda não adicionou canais aos favoritos."
        />
      ) : channels === null ? (
        <ChannelGridSkeleton count={favorites.length} />
      ) : (
        <ChannelGrid channels={channels} />
      )}
    </main>
  );
}
