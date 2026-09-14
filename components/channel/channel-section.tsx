import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { ApiChannelListItem } from "@/lib/api/serialize-channel";

import { ChannelGrid } from "./channel-grid";

export function ChannelSection({
  title,
  channels,
  categorySlug,
  priorityCount = 0,
}: {
  title: string;
  channels: ApiChannelListItem[];
  categorySlug?: string;
  priorityCount?: number;
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
      <ChannelGrid channels={channels} priorityCount={priorityCount} />
    </section>
  );
}
