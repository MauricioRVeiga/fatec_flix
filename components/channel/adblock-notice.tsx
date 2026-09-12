import { ShieldAlert } from "lucide-react";
import Link from "next/link";

/**
 * Aviso opcional recomendando a extensão de bloqueio de anúncios
 * (extension/) antes de assistir — os servidores de vídeo são de
 * terceiros e podem exibir anúncios/popups fora do nosso controle.
 * Só faz sentido mostrar quando o player de fato vai renderizar um
 * iframe externo (features.externalEmbeds), então quem chama decide
 * isso, não este componente.
 */
export function AdblockNotice() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
      <p>
        Servidores externos podem exibir anúncios/popups.{" "}
        <Link href="/extensao" className="font-medium underline underline-offset-2">
          Instale nossa extensão opcional de bloqueio
        </Link>
        .
      </p>
    </div>
  );
}
