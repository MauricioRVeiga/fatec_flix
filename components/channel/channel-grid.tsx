import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { ChannelCard } from "./channel-card";

/**
 * Grid adaptativo (PROJECT.md §65) — não fixa contagem de colunas por
 * breakpoint, deixa o `auto-fill` decidir conforme o espaço.
 */
export function ChannelGrid({
  channels,
  priorityCount = 0,
}: {
  channels: ApiChannelListItem[];
  /** Quantos dos primeiros cards carregam a logo com prioridade (LCP acima da dobra). */
  priorityCount?: number;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
      {channels.map((channel, index) => (
        <ChannelCard key={channel.id} channel={channel} priority={index < priorityCount} />
      ))}
    </div>
  );
}
