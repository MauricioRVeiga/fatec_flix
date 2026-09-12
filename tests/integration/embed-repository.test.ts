import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEmbedRepository } from "@/lib/repositories/embed-repository";
import type { Database } from "@/types/database";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

function asClient(fake: FakeSupabaseClient) {
  return fake as unknown as SupabaseClient<Database>;
}

describe("EmbedRepository (integração)", () => {
  let fake: FakeSupabaseClient;

  beforeEach(() => {
    fake = new FakeSupabaseClient();
  });

  it("upsertMany deduplica (channel_id, embed_url) repetidos no mesmo lote", async () => {
    const repo = createEmbedRepository(asClient(fake));

    const result = await repo.upsertMany([
      { channel_id: "globo", embed_url: "https://a.example.com", provider: "P1" },
      { channel_id: "globo", embed_url: "https://a.example.com", provider: "P1 (duplicado)" },
    ]);

    expect(result.created).toBe(1);
    expect(fake.getTable("channel_embeds")).toHaveLength(1);
    expect(fake.getTable("channel_embeds")[0].provider).toBe("P1 (duplicado)");
  });

  it("markStaleInactive só desativa embeds que sumiram (PROJECT.md §23)", async () => {
    fake.seed("channel_embeds", [
      {
        id: 1,
        channel_id: "globo",
        embed_url: "https://a.example.com",
        active: true,
        last_seen_at: "2020-01-01T00:00:00Z",
      },
    ]);
    const repo = createEmbedRepository(asClient(fake));

    const count = await repo.markStaleInactive(new Date("2030-01-01T00:00:00Z"));

    expect(count).toBe(1);
    expect(fake.getTable("channel_embeds")[0].active).toBe(false);
    // nunca deleta
    expect(fake.getTable("channel_embeds")).toHaveLength(1);
  });

  it("listActiveByChannelId ordena por position", async () => {
    fake.seed("channel_embeds", [
      { id: 1, channel_id: "globo", position: 1, active: true, provider: "Segundo" },
      { id: 2, channel_id: "globo", position: 0, active: true, provider: "Primeiro" },
    ]);
    const repo = createEmbedRepository(asClient(fake));

    const rows = await repo.listActiveByChannelId("globo");

    expect(rows.map((r) => r.provider)).toEqual(["Primeiro", "Segundo"]);
  });

  it("listActiveByChannelId ignora embeds inativos", async () => {
    fake.seed("channel_embeds", [
      { id: 1, channel_id: "globo", position: 0, active: false, provider: "Inativo" },
    ]);
    const repo = createEmbedRepository(asClient(fake));

    expect(await repo.listActiveByChannelId("globo")).toHaveLength(0);
  });
});
