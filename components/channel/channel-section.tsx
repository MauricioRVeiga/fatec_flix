import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { ChannelGrid } from "./channel-grid";

/**
 * Seção da homepage (PROJECT.md §32) — só renderiza se houver
 * canais, para nunca mostrar uma seção vazia sem sentido.
 *
 * `categorySlug` é opcional: seções que não são uma categoria de
 * verdade (Em destaque, Agora na TV) não linkam pra lugar nenhum.
 */
export function ChannelSection({
  title,
  channels,
  categorySlug,
}: {
  title: string;
  channels: ApiChannelListItem[];
  categorySlug?: string;
}) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {categorySlug && (
          <Link
            href={`/categoria/${categorySlug}`}
            className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ChannelGrid channels={channels} />
    </section>
  );
}
