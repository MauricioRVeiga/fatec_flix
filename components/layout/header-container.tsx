import { headers } from "next/headers";

import { getLastSyncTime } from "@/lib/api/get-sync-status";

import { Header } from "./header";

export async function HeaderContainer() {
  // Keep the client Header mounted so it can react to navigation after login.
  // The login screen does not need a catalog database request.
  if ((await headers()).get("x-pathname") === "/login") {
    return <Header lastSyncTimeIso={null} />;
  }

  const lastSyncTime = await getLastSyncTime();

  return <Header lastSyncTimeIso={lastSyncTime?.toISOString() ?? null} />;
}
