import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { features } from "@/config/features";

/**
 * Headers de segurança (PROJECT.md §56, SECURITY-OWASP-TOP-10-2025.md
 * §12–§17): CSP, X-Content-Type-Options, Referrer-Policy,
 * Permissions-Policy.
 *
 * CSP com nonce por requisição (padrão oficial documentado pelo
 * Next.js) em vez de `'unsafe-inline'` — o app tem um script inline
 * (app/layout.tsx, aplica o tema antes da hidratação) e o próprio
 * Next injeta scripts inline para os payloads de RSC/hidratação; um
 * `'unsafe-inline'` global anularia a proteção contra XSS que a CSP
 * deveria dar. O nonce é gerado aqui, propagado via header
 * `x-nonce` para o Server Component ler (`app/layout.tsx`), e o
 * próprio Next aplica esse nonce nos scripts que ele gera quando
 * detecta a CSP no header da resposta.
 *
 * Arquivo chamado `proxy.ts` (não `middleware.ts`) — convenção nova
 * do Next.js 16, `middleware.ts` foi descontinuado (aviso de
 * depreciação visto no build, seguido conforme AGENTS.md manda).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' só em dev (Next/Turbopack usam eval no HMR) —
    // nunca em produção (PROJECT.md §56 pede pra evitar sempre que possível).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    // Embeds desligados (padrão): nenhum iframe é renderizado, então
    // nenhum host precisa ser permitido (PROJECT.md §3.2). Ligados:
    // o upstream pode adicionar providers novos dinamicamente, então
    // não dá pra manter uma allowlist fixa de hosts aqui — o
    // ChannelPlayer já valida https + não-nosso-domínio antes de
    // montar o iframe (components/channel/channel-player.tsx).
    features.externalEmbeds ? `frame-src https:` : `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  matcher: [
    // Todas as rotas exceto assets estáticos do Next (não precisam de CSP).
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
