import { ShieldAlert } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

const MOBILE_USER_AGENT_REGEX = /android|iphone|ipad|ipod|mobile/i;

/**
 * Aviso opcional antes de assistir — os servidores de vídeo são de
 * terceiros e podem exibir anúncios/popups fora do nosso controle. Só
 * faz sentido mostrar quando o player de fato vai renderizar um
 * iframe externo (features.externalEmbeds), então quem chama decide
 * isso, não este componente.
 *
 * A extensão (extension/) só funciona em navegador desktop — Chrome
 * mobile não permite instalar extensão customizada, e no Safari/iOS
 * isso exigiria um app nativo publicado na App Store, fora do escopo
 * deste projeto. Em vez de linkar pra algo que não instala em
 * celular, detecta o User-Agent no servidor e recomenda um navegador
 * mobile com bloqueio de anúncio nativo.
 */
export async function AdblockNotice() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isMobile = MOBILE_USER_AGENT_REGEX.test(userAgent);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
      {isMobile ? (
        <p>
          Servidores externos podem exibir anúncios/popups. No celular, um navegador
          com bloqueio nativo (ex.:{" "}
          <a
            href="https://brave.com/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Brave
          </a>
          ) ajuda mais do que qualquer extensão — Android e iOS não permitem instalar
          extensão customizada de navegador.
        </p>
      ) : (
        <p>
          Servidores externos podem exibir anúncios/popups.{" "}
          <Link href="/extensao" className="font-medium underline underline-offset-2">
            Instale nossa extensão opcional de bloqueio
          </Link>{" "}
          (desktop apenas).
        </p>
      )}
    </div>
  );
}
