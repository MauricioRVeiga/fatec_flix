"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ChannelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("channel_page_error_boundary", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Não foi possível carregar o canal</h1>
      <p className="max-w-sm text-muted-foreground">
        Tente novamente em instantes ou volte para o catálogo.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="outline" render={<Link href="/">Voltar ao catálogo</Link>} />
      </div>
    </main>
  );
}
