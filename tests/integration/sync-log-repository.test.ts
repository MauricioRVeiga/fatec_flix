import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSyncLogRepository } from "@/lib/repositories/sync-log-repository";
import type { Database } from "@/types/database";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

function asClient(fake: FakeSupabaseClient) {
  return fake as unknown as SupabaseClient<Database>;
}

describe("SyncLogRepository (integração)", () => {
  let fake: FakeSupabaseClient;

  beforeEach(() => {
    fake = new FakeSupabaseClient();
  });

  it("listRecent retorna as execuções mais recentes primeiro, até o limite (painel /admin, PROJECT.md §82)", async () => {
    fake.seed("sync_logs", [
      { id: 1, sync_type: "channels", status: "success", started_at: "2030-01-01T00:00:00Z" },
      { id: 2, sync_type: "channels", status: "failed", started_at: "2030-01-03T00:00:00Z" },
      { id: 3, sync_type: "channels", status: "success", started_at: "2030-01-02T00:00:00Z" },
      { id: 4, sync_type: "other", status: "success", started_at: "2030-01-04T00:00:00Z" },
    ]);
    const repo = createSyncLogRepository(asClient(fake));

    const rows = await repo.listRecent("channels", 2);

    expect(rows.map((r) => r.id)).toEqual([2, 3]);
  });

  it("listRecent retorna lista vazia quando não há execuções", async () => {
    const repo = createSyncLogRepository(asClient(fake));

    expect(await repo.listRecent("channels", 10)).toEqual([]);
  });
});
