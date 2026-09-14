"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApiEmbed } from "@/lib/api/serialize-channel";

export function ProviderSelector({
  embeds,
  selectedIndex,
  onSelect,
}: {
  embeds: ApiEmbed[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (embeds.length < 2) {
    return null;
  }

  return (
    <div role="group" aria-label="Selecionar servidor" className="flex flex-wrap gap-2">
      {embeds.map((embed, index) => (
        <button
          key={`${index}-${embed.provider}`}
          type="button"
          aria-pressed={index === selectedIndex}
          onClick={() => onSelect(index)}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            index === selectedIndex
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          {embed.provider}
          {embed.quality && (
            <Badge variant="secondary" className="text-[10px]">
              {embed.quality}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
