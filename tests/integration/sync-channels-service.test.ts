import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { channelSchema } from "@/lib/upstream/schemas";
import type { Database } from "@/types/database";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";
import fixturesRaw from "../fixtures/channels.json";

vi.mock("@/lib/upstream/channels", () => ({
  getUpstreamChannels: vi.fn(async () => ({
    channels: fixturesRaw.data.map((raw) => channelSchema.parse(raw)),
    total: fixturesRaw.data.length,
    invalidCount: 0,
  })),
}));

const { syncChannels } = await import("@/services/sync-channels");
const { getUpstreamChannels } = await import("@/lib/upstream/channels");

function asClient(fake: FakeSupabaseClient) {
  return fake as unknown as SupabaseClient<Database>;
}

describe("syncChannels (integração — fixtures + fake do Supabase, sem rede/banco reais)", () => {
  let fake: FakeSupabaseClient;

  beforeEach(() => {
    fake = new FakeSupabaseClient();
    vi.mocked(getUpstreamChannels).mockClear();
  });

  it("sincroniza os 6 canais do fixture do zero (todos criados)", async () => {
    const result = await syncChannels(asClient(fake));

    expect(result.status).toBe("success");
    expect(result.received).toBe(6);
    expect(result.created).toBe(6);
    expect(result.updated).toBe(0);
    expect(result.failed).toBe(0);

    expect(fake.getTable("channels")).toHaveLength(6);
    expect(fake.getTable("channel_embeds")).toHaveLength(7);
    expect(fake.getTable("channel_epg").map((r) => r.channel_id)).not.toContain("canal-sem-epg");
    expect(fake.getTable("channel_epg")).toHaveLength(5);
  });

  it("rodar de novo atualiza em vez de duplicar", async () => {
    await syncChannels(asClient(fake));
    const result = await syncChannels(asClient(fake));

    expect(result.created).toBe(0);
    expect(result.updated).toBe(6);
    expect(fake.getTable("channels")).toHaveLength(6);
  });

  it("marca como inativo um canal que já existia mas não veio mais do upstream (PROJECT.md §22)", async () => {
    fake.seed("channels", [
      {
        id: "canal-removido-do-upstream",
        name: "Vai sumir",
        active: true,
        last_seen_at: "2020-01-01T00:00:00Z",
      },
    ]);

    await syncChannels(asClient(fake));

    const removedChannel = fake
      .getTable("channels")
      .find((row) => row.id === "canal-removido-do-upstream");
    expect(removedChannel?.active).toBe(false);
    expect(removedChannel).toBeDefined();
  });

  it("registra o resultado em sync_logs", async () => {
    await syncChannels(asClient(fake));

    const logs = fake.getTable("sync_logs");
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("success");
    expect(logs[0].records_received).toBe(6);
    expect(logs[0].finished_at).toBeDefined();
  });

  it("uma segunda sincronização concorrente sai como skipped (PROJECT.md §26)", async () => {
    await fake.rpc("try_acquire_sync_lock", { p_sync_type: "channels", p_ttl_seconds: 300 });

    const result = await syncChannels(asClient(fake));

    expect(result.status).toBe("skipped");
    expect(fake.getTable("channels")).toHaveLength(0);
  });

  it("erro do upstream vira status failed, sem lançar exceção pra quem chamou (PROJECT.md §54)", async () => {
    vi.mocked(getUpstreamChannels).mockRejectedValueOnce(new Error("upstream fora do ar"));

    const result = await syncChannels(asClient(fake));

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("upstream fora do ar");

    const logs = fake.getTable("sync_logs");
    expect(logs[0].status).toBe("failed");
  });

  it("libera o lock mesmo quando a sincronização falha", async () => {
    vi.mocked(getUpstreamChannels).mockRejectedValueOnce(new Error("falhou"));

    await syncChannels(asClient(fake));

    const second = await syncChannels(asClient(fake));
    expect(second.status).not.toBe("skipped");
  });
});
