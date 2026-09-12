/**
 * Feature flags da aplicação (PROJECT.md §81).
 */
export const features = {
  /**
   * Controla a renderização de embeds externos (iframes de
   * providers). Deve permanecer `false` até haver autorização para
   * uso do conteúdo correspondente (PROJECT.md §3.2).
   */
  externalEmbeds: process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS === "true",
} as const;
