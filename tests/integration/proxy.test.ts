import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateSupabaseSession } = vi.hoisted(() => ({
  updateSupabaseSession: vi.fn(),
}));

vi.mock("@/lib/supabase/middleware", () => ({ updateSupabaseSession }));

import { config, proxy } from "@/proxy";

describe("proxy do login", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAIL", "Admin@Example.com");
    updateSupabaseSession.mockReset();
    updateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      user: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("permite buscar a imagem do login sem executar a autenticação", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/images/login-cinema.webp" })
    ).toBe(false);
  });

  it.each([
    "/",
    "/admin",
    "/images/private.webp",
    "/images/login-cinema.webp/private",
    "/images/login-cinemaXwebp",
  ])("mantém a proteção das outras rotas (%s)", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it("aceita a sessão do admin com diferenças de maiúsculas no ambiente", async () => {
    updateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { email: "admin@example.com" },
    });

    const response = await proxy(new NextRequest("https://example.com/login?next=/admin"));

    expect(response.headers.get("location")).toBe("https://example.com/admin");
  });

  it("direciona outro usuário ao login mantendo o destino solicitado", async () => {
    updateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { email: "other@example.com" },
    });

    const response = await proxy(new NextRequest("https://example.com/admin?tab=channels"));

    expect(response.headers.get("location")).toBe(
      "https://example.com/login?next=%2Fadmin%3Ftab%3Dchannels"
    );
  });

  it("envia o caminho real ao layout substituindo headers fornecidos pelo cliente", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/login", {
        headers: { "x-pathname": "/admin" },
      })
    );

    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/login");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
