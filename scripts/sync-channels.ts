/**
 * CLI para popular o Supabase manualmente a partir do upstream
 * (PROJECT.md §69): `npm run sync:channels`.
 *
 * Carrega `.env` / `.env.local` manualmente porque este script roda
 * fora do runtime do Next.js (que faz esse carregamento sozinho).
 * Import dinâmico do serviço *depois* de carregar o env, já que
 * `lib/upstream/client.ts` lê `process.env.UPSTREAM_API_URL` no
 * top-level do módulo. O `await import` fica dentro de `main()` (em
 * vez de top-level) porque `tsx` roda este script como CJS, que não
 * suporta top-level await.
 *
 * Precisa rodar com `tsx --conditions=react-server` (ver script
 * `sync:channels` no package.json): os módulos deste projeto usam
 * `import "server-only"` para impedir que credenciais admin sejam
 * importadas por Client Components. Fora do bundler do Next.js (que
 * seta a condition "react-server" ao empacotar código de servidor),
 * esse pacote lança erro incondicionalmente — a condition precisa
 * ser passada manualmente para o Node.
 */

async function main() {
  for (const file of [".env", ".env.local"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // arquivo opcional — segue sem ele.
    }
  }

  const { syncChannels } = await import("../services/sync-channels");

  console.log("Channel Sync\n");

  const result = await syncChannels();

  console.log(`Received: ${result.received}`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Errors: ${result.failed}`);
  console.log();

  if (result.status === "skipped") {
    console.log(`Sync skipped: ${result.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "failed") {
    console.error(`Sync failed: ${result.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "partial") {
    console.log(`Sync completed with ${result.failed} invalid record(s).`);
    return;
  }

  console.log("Sync completed successfully.");
}

main().catch((error) => {
  console.error("Sync crashed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
