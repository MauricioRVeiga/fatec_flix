"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ApiEmbed } from "@/lib/api/serialize-channel";

import { ProviderSelector } from "./provider-selector";

function getSafeEmbedUrl(embedUrl: string | undefined): string | null {
  if (!embedUrl || !embedUrl.startsWith("https://")) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const embedHost = new URL(embedUrl).hostname;
    const appHost = appUrl ? new URL(appUrl).hostname : null;

    if (appHost && embedHost === appHost) {
      return null;
    }
  } catch {
    return null;
  }

  return embedUrl;
}

export function ChannelPlayer({
  channelName,
  embeds,
}: {
  channelName: string;
  embeds: ApiEmbed[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const embed = embeds[selectedIndex];
  const embedUrl = getSafeEmbedUrl(embed?.embed_url);
  const hasFailed = failedIndices.has(selectedIndex);

  const nextAvailableIndex = embeds.findIndex(
    (_, index) => index !== selectedIndex && !failedIndices.has(index)
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
        {embedUrl && !hasFailed ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={`Player de ${channelName} — ${embed.provider}`}
            loading="lazy"
            allow="fullscreen; picture-in-picture; camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; midi 'none'; xr-spatial-tracking 'none'; clipboard-write 'none'"
            referrerPolicy="no-referrer"
            className="size-full"
            onError={() => setFailedIndices((prev) => new Set(prev).add(selectedIndex))}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-foreground">
              Este servidor está indisponível no momento.
              <br />
              Tente outro servidor.
            </p>
            {nextAvailableIndex !== -1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIndex(nextAvailableIndex)}
              >
                Tentar {embeds[nextAvailableIndex].provider}
              </Button>
            )}
          </div>
        )}
      </div>

      <ProviderSelector
        embeds={embeds}
        selectedIndex={selectedIndex}
        onSelect={(index) => setSelectedIndex(index)}
      />
    </div>
  );
}
