import { Tv } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Tv className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">
        O conteúdo que você procura não existe ou foi removido.
      </p>
      <Button nativeButton={false} render={<Link href="/">Voltar para o início</Link>} />
    </main>
  );
}
