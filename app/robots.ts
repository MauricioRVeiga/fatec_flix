import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /api/*: nada aqui é conteúdo pra indexar. /favoritos: página
      // pessoal, só tem sentido com o localStorage de quem acessa —
      // pra um crawler ela está sempre vazia (PROJECT.md §51).
      disallow: ["/api/", "/favoritos"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
