import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createChannelRepository } from "@/lib/repositories/channel-repository";
import type { Database } from "@/types/database";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

function asClient(fake: FakeSupabaseClient) {
  return fake as unknown as SupabaseClient<Database>;
}

describe("ChannelRepository (integração, sem tocar no Supabase real)", () => {
  let fake: FakeSupabaseClient;

  beforeEach(() => {
    fake = new FakeSupabaseClient();
  });

  it("upsertMany distingue criados de atualizados (PROJECT.md §20)", async () => {
    fake.seed("channels", [{ id: "existente", name: "Antigo", active: true }]);
    const repo = createChannelRepository(asClient(fake));

    const result = await repo.upsertMany([
      { id: "existente", name: "Atualizado" },
      { id: "novo", name: "Canal Novo" },
    ]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);

    const rows = fake.getTable("channels");
    expect(rows.find((r) => r.id === "existente")?.name).toBe("Atualizado");
    expect(rows.find((r) => r.id === "novo")).toBeDefined();
  });

  it("upsertMany deduplica quando o upstream manda o mesmo id duas vezes", async () => {
    const repo = createChannelRepository(asClient(fake));

    const result = await repo.upsertMany([
      { id: "duplicado", name: "Primeira versão" },
      { id: "duplicado", name: "Segunda versão" },
    ]);

    expect(result.created).toBe(1);
    expect(fake.getTable("channels")).toHaveLength(1);
    expect(fake.getTable("channels")[0].name).toBe("Segunda versão");
  });

  it("markStaleInactive só marca inativo quem não apareceu na sincronização (PROJECT.md §22)", async () => {
    const syncStartedAt = new Date("2030-01-01T12:00:00Z");
    fake.seed("channels", [
      { id: "visto-antes", name: "A", active: true, last_seen_at: "2029-12-31T00:00:00Z" },
      {
        id: "visto-agora",
        name: "B",
        active: true,
        last_seen_at: syncStartedAt.toISOString(),
      },
    ]);
    const repo = createChannelRepository(asClient(fake));

    const count = await repo.markStaleInactive(syncStartedAt);

    expect(count).toBe(1);
    const rows = fake.getTable("channels");
    expect(rows.find((r) => r.id === "visto-antes")?.active).toBe(false);
    expect(rows.find((r) => r.id === "visto-agora")?.active).toBe(true);
  });

  it("markStaleInactive nunca deleta, só desativa (PROJECT.md §22)", async () => {
    fake.seed("channels", [
      { id: "sumiu", name: "A", active: true, last_seen_at: "2020-01-01T00:00:00Z" },
    ]);
    const repo = createChannelRepository(asClient(fake));

    await repo.markStaleInactive(new Date("2030-01-01T00:00:00Z"));

    expect(fake.getTable("channels")).toHaveLength(1);
  });

  it("listActive só retorna canais ativos", async () => {
    fake.seed("channels", [
      { id: "ativo", name: "Ativo", active: true, category: "Esportes" },
      { id: "inativo", name: "Inativo", active: false, category: "Esportes" },
    ]);
    const repo = createChannelRepository(asClient(fake));

    const { rows, total } = await repo.listActive({ page: 1, limit: 10 });

    expect(total).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("ativo");
  });

  it("listActive filtra por categoria", async () => {
    fake.seed("channels", [
      { id: "a", name: "A", active: true, category: "Esportes" },
      { id: "b", name: "B", active: true, category: "Notícias" },
    ]);
    const repo = createChannelRepository(asClient(fake));

    const { rows } = await repo.listActive({ category: "Esportes", page: 1, limit: 10 });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("a");
  });

  it("listActive busca por nome (PROJECT.md §42)", async () => {
    fake.seed("channels", [
      { id: "globo", name: "Globo", active: true, description: null, category: "Canais Abertos" },
      { id: "sbt", name: "SBT", active: true, description: null, category: "Canais Abertos" },
    ]);
    const repo = createChannelRepository(asClient(fake));

    const { rows } = await repo.listActive({ q: "glob", page: 1, limit: 10 });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("globo");
  });

  it("getActiveById retorna null para canal inativo", async () => {
    fake.seed("channels", [{ id: "inativo", name: "Inativo", active: false }]);
    const repo = createChannelRepository(asClient(fake));

    expect(await repo.getActiveById("inativo")).toBeNull();
  });

  it("countActive conta só os ativos", async () => {
    fake.seed("channels", [
      { id: "a", active: true },
      { id: "b", active: true },
      { id: "c", active: false },
    ]);
    const repo = createChannelRepository(asClient(fake));

    expect(await repo.countActive()).toBe(2);
  });
});
