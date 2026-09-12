import { getLastSyncTime } from "@/lib/api/get-sync-status";

import { Header } from "./header";

/**
 * Server Component fina só pra buscar a hora da última sincronização
 * (PROJECT.md §76) e passar pro Header (Client Component — não pode
 * buscar isso sozinho). Fica dentro do <Suspense> do layout, então
 * uma leitura lenta não trava o resto da página.
 */
export async function HeaderContainer() {
  const lastSyncTime = await getLastSyncTime();

  return <Header lastSyncTimeIso={lastSyncTime?.toISOString() ?? null} />;
}
