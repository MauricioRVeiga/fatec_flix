import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { ChannelCard } from "./channel-card";

/**
 * Grid adaptativo (PROJECT.md §65) — não fixa contagem de colunas por
 * breakpoint, deixa o `auto-fill` decidir conforme o espaço.
 */
export function ChannelGrid({ channels }: { channels: ApiChannelListItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  );
}
