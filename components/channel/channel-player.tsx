"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ApiEmbed } from "@/lib/api/serialize-channel";

import { ProviderSelector } from "./provider-selector";

/**
 * Defesa em profundidade antes de renderizar o iframe (PROJECT.md
 * §57/§58): além de exigir https (já validado em toApiEmbeds), nunca
 * apontar o player para o nosso próprio domínio.
 *
 * Esta checagem ficou ainda mais importante depois que o `sandbox`
 * foi removido do iframe (ver comentário abaixo) — sem ela, um
 * `embed_url` apontando pro nosso próprio domínio rodaria com acesso
 * total e sem nenhuma contenção ao DOM/localStorage do próprio app.
 */
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

/**
 * Player (PROJECT.md §37). Client Component — precisa de estado pra
 * trocar de servidor (PROJECT.md §49).
 *
 * Só é renderizado pela página quando `features.externalEmbeds` está
 * ligado e o canal tem pelo menos um embed — a checagem da flag fica
 * no Server Component (app/canal/[id]/page.tsx) pra não mandar esse
 * componente pro bundle do cliente à toa quando embeds estão
 * desligados (PROJECT.md §3.2).
 */
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
            // SEM `sandbox` — decisão explícita (2026-09-12): o provider
            // detecta o sandbox e bloqueia o player até ele ser
            // removido. Sem `sandbox`, este iframe roda com as mesmas
            // capacidades de qualquer <iframe> comum — inclusive
            // abrir popup por clique, o que nenhuma configuração aqui
            // consegue impedir (não existe Permissions-Policy pra
            // "popups"; quem bloqueia isso é justamente o `sandbox`
            // que acabamos de tirar). O que ainda dá pra restringir via
            // Permissions-Policy fica listado abaixo, como mitigação
            // parcial — não elimina popups/anúncios do provider.
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
