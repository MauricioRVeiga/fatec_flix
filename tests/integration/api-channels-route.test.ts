import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const fake = new FakeSupabaseClient();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => fake,
}));

const { GET } = await import("@/app/api/channels/route");

describe("GET /api/channels (integração — Supabase fake, sem rede)", () => {
  beforeEach(() => {
    for (const table of ["channels", "channel_embeds", "channel_epg"]) {
      const rows = fake.getTable(table);
      rows.splice(0, rows.length);
    }
    fake.seed("channels", [
      { id: "globo", name: "Globo", active: true, category: "Canais Abertos" },
      { id: "sbt", name: "SBT", active: true, category: "Canais Abertos" },
    ]);
  });

  it("retorna a lista paginada no formato do PROJECT.md §28", async () => {
    const request = new Request("https://app.example.com/api/channels?limit=1&page=1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({ page: 1, limit: 1, total: 2, pages: 2 });
  });

  it("filtra por categoria", async () => {
    fake.seed("channels", [{ id: "espn", name: "ESPN", active: true, category: "Esportes" }]);

    const request = new Request(
      "https://app.example.com/api/channels?category=Esportes&limit=10"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("espn");
  });

  it("rejeita limit inválido com 400 (PROJECT.md §19 — nunca confiar em input sem validar)", async () => {
    const request = new Request("https://app.example.com/api/channels?limit=99999");
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it("rejeita page inválido com 400", async () => {
    const request = new Request("https://app.example.com/api/channels?page=-1");
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
