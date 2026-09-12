import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (PROJECT.md §67): homepage, buscar canal, abrir canal,
 * favoritar, trocar categoria. Roda contra o `next dev` de verdade —
 * usa o Supabase/upstream reais já sincronizados, então as
 * asserções evitam depender de nomes de canal específicos que podem
 * mudar (checam estrutura/contagem, não conteúdo exato).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Contra o build de produção, não `next dev`: o dev server
    // compila cada rota sob demanda no primeiro acesso, e vários
    // workers do Playwright batendo nele ao mesmo tempo (fullyParallel)
    // estoura o timeout de navegação. `next start` já serve tudo
    // pronto.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
