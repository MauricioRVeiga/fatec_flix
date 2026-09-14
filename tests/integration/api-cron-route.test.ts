import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/sync-channels", () => ({
  syncChannels: vi.fn(async () => ({
    status: "success",
    received: 0,
    created: 0,
    updated: 0,
    failed: 0,
    durationMs: 1,
  })),
}));

const { GET } = await import("@/app/api/cron/sync-channels/route");

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

describe("GET /api/cron/sync-channels (integração — autenticação, PROJECT.md §24)", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "segredo-de-teste";
  });

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  });

  it("rejeita sem header Authorization", async () => {
    const request = new Request("https://app.example.com/api/cron/sync-channels");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejeita com secret errado", async () => {
    const request = new Request("https://app.example.com/api/cron/sync-channels", {
      headers: { Authorization: "Bearer secret-errado" },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("aceita com o secret certo", async () => {
    const request = new Request("https://app.example.com/api/cron/sync-channels", {
      headers: { Authorization: "Bearer segredo-de-teste" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("fail closed: rejeita mesmo com header correto se CRON_SECRET não estiver configurado", async () => {
    process.env.CRON_SECRET = "";

    const request = new Request("https://app.example.com/api/cron/sync-channels", {
      headers: { Authorization: "Bearer " },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
