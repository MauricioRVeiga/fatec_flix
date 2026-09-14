import { ShieldAlert } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

const MOBILE_USER_AGENT_REGEX = /android|iphone|ipad|ipod|mobile/i;

export async function AdblockNotice() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isMobile = MOBILE_USER_AGENT_REGEX.test(userAgent);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
      {isMobile ? (
        <p>
          Servidores externos podem exibir anúncios/popups.{" "}
          <a
            href="https://adguard-dns.io/en/public-dns.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Configure um DNS com filtro de anúncios (ex.: AdGuard DNS)
          </a>{" "}
          nas configurações do celular — funciona em qualquer navegador, sem
          precisar instalar app ou extensão. Android e iOS não permitem
          instalar extensão customizada de navegador.
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
