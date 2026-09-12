import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEpgRepository } from "@/lib/repositories/epg-repository";
import type { Database } from "@/types/database";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

function asClient(fake: FakeSupabaseClient) {
  return fake as unknown as SupabaseClient<Database>;
}

describe("EpgRepository (integração)", () => {
  let fake: FakeSupabaseClient;

  beforeEach(() => {
    fake = new FakeSupabaseClient();
  });

  it("upsertMany grava/atualiza pela chave channel_id", async () => {
    fake.seed("channel_epg", [{ channel_id: "globo", current_title: "Antigo" }]);
    const repo = createEpgRepository(asClient(fake));

    await repo.upsertMany([{ channel_id: "globo", current_title: "Novo" }]);

    expect(fake.getTable("channel_epg")).toHaveLength(1);
    expect(fake.getTable("channel_epg")[0].current_title).toBe("Novo");
  });

  it("deleteForChannels remove o snapshot de EPG de canais sem programação (PROJECT.md §41)", async () => {
    fake.seed("channel_epg", [
      { channel_id: "sem-epg-agora", current_title: "Desatualizado" },
      { channel_id: "com-epg", current_title: "Atual" },
    ]);
    const repo = createEpgRepository(asClient(fake));

    await repo.deleteForChannels(["sem-epg-agora"]);

    const rows = fake.getTable("channel_epg");
    expect(rows).toHaveLength(1);
    expect(rows[0].channel_id).toBe("com-epg");
  });

  it("getByChannelId retorna null quando não há EPG", async () => {
    const repo = createEpgRepository(asClient(fake));
    expect(await repo.getByChannelId("inexistente")).toBeNull();
  });
});
