import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { ChannelCard } from "./channel-card";

export function ChannelGrid({
  channels,
  priorityCount = 0,
}: {
  channels: ApiChannelListItem[];
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
