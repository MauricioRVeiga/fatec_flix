import { getLastSyncTime } from "@/lib/api/get-sync-status";

import { Header } from "./header";

export async function HeaderContainer() {
  const lastSyncTime = await getLastSyncTime();

  return <Header lastSyncTimeIso={lastSyncTime?.toISOString() ?? null} />;
}
