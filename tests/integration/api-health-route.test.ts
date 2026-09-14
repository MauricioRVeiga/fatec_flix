import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const fake = new FakeSupabaseClient();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => fake,
}));

vi.mock("@/lib/upstream/health", () => ({
  getUpstreamHealth: vi.fn(async () => ({ status: "healthy", checks: null })),
}));

const { GET } = await import("@/app/api/health/route");
const { getUpstreamHealth } = await import("@/lib/upstream/health");

describe("GET /api/health (integração)", () => {
  beforeEach(() => {
    for (const table of ["channels", "sync_logs"]) {
      const rows = fake.getTable(table);
      rows.splice(0, rows.length);
    }
    vi.mocked(getUpstreamHealth).mockClear();
  });

  it("reporta healthy quando tudo está ok (PROJECT.md §28)", async () => {
    fake.seed("channels", [{ id: "a", active: true }]);
    fake.seed("sync_logs", [
      {
        id: 1,
        sync_type: "channels",
        status: "success",
        started_at: "2030-01-01T00:00:00Z",
        finished_at: "2030-01-01T00:00:10Z",
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.database).toBe(true);
    expect(body.channels).toBe(1);
    expect(body.upstream.status).toBe("healthy");
    expect(JSON.stringify(body)).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|password/i);
  });

  it("reporta degraded quando a última sincronização falhou", async () => {
    fake.seed("sync_logs", [
      {
        id: 1,
        sync_type: "channels",
        status: "failed",
        started_at: "2030-01-01T00:00:00Z",
        finished_at: "2030-01-01T00:00:10Z",
        error_message: "algo quebrou",
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("degraded");
    expect(body.error_message).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("algo quebrou");
  });

  it("reporta degraded quando uma sync ficou 'running' por tempo demais (travada)", async () => {
    fake.seed("sync_logs", [
      {
        id: 1,
        sync_type: "channels",
        status: "running",
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        finished_at: null,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("degraded");
  });

  it("reporta unhealthy quando o banco falha", async () => {
    const originalFrom = fake.from.bind(fake);
    fake.from = () => {
      throw new Error("conexão recusada");
    };

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("unhealthy");
    expect(body.database).toBe(false);

    fake.from = originalFrom;
  });
});
