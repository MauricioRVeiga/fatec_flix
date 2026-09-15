import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAuthServerSupabaseClient: async () => ({
    auth: { signInWithPassword, signOut },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

let ipCounter = 0;
let currentIp = () => `test-ip-${++ipCounter}`;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": currentIp() }),
}));

const { loginAction } = await import("@/app/login/actions");

function formData(email: string, password: string, next?: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  if (next !== undefined) {
    fd.set("next", next);
  }
  return fd;
}

describe("loginAction (/login, PROJECT.md §82)", () => {
  const ORIGINAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    signInWithPassword.mockReset();
    signOut.mockReset();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterAll(() => {
    process.env.ADMIN_EMAIL = ORIGINAL_ADMIN_EMAIL;
  });

  it("erro genérico sem chamar o Supabase quando e-mail/senha estão vazios", async () => {
    const result = await loginAction({ error: null }, formData("", ""));

    expect(result.error).toBe("Preencha e-mail e senha.");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("erro genérico quando as credenciais são inválidas", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await loginAction({ error: null }, formData("x@example.com", "errada"));

    expect(result.error).toBe("E-mail ou senha inválidos.");
  });

  it("mesmo erro genérico quando a senha está certa mas o e-mail não é o admin — e desloga em seguida", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "outro@example.com" } },
      error: null,
    });

    const result = await loginAction({ error: null }, formData("outro@example.com", "correta"));

    expect(result.error).toBe("E-mail ou senha inválidos.");
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("redireciona para / quando o e-mail é exatamente o ADMIN_EMAIL e não há next", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    await expect(
      loginAction({ error: null }, formData("admin@example.com", "correta"))
    ).rejects.toThrow(/^REDIRECT:\/$/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("aceita o admin com diferenças de maiúsculas e espaços na configuração", async () => {
    process.env.ADMIN_EMAIL = " Admin@Example.com ";
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    await expect(
      loginAction({ error: null }, formData("Admin@Example.com", "correta"))
    ).rejects.toThrow(/^REDIRECT:\/$/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("recusa a sessão e desloga quando ADMIN_EMAIL não está configurado", async () => {
    delete process.env.ADMIN_EMAIL;
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    const result = await loginAction(
      { error: null },
      formData("admin@example.com", "correta")
    );

    expect(result.error).toBe("E-mail ou senha inválidos.");
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("redireciona para o next quando é um caminho interno válido", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    await expect(
      loginAction(
        { error: null },
        formData("admin@example.com", "correta", "/canal/globo")
      )
    ).rejects.toThrow("REDIRECT:/canal/globo");
  });

  it("ignora um next que tenta open redirect e cai em /", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    await expect(
      loginAction(
        { error: null },
        formData("admin@example.com", "correta", "//evil.com")
      )
    ).rejects.toThrow(/^REDIRECT:\/$/);
  });

  it("bloqueia após 5 tentativas do mesmo IP em 5 minutos (força bruta)", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const fixedIp = "attacker-ip";
    const previousCurrentIp = currentIp;
    currentIp = () => fixedIp;

    try {
      for (let i = 0; i < 5; i++) {
        const result = await loginAction(
          { error: null },
          formData("admin@example.com", "senha-errada")
        );
        expect(result.error).toBe("E-mail ou senha inválidos.");
      }

      const blocked = await loginAction(
        { error: null },
        formData("admin@example.com", "senha-errada")
      );
      expect(blocked.error).toBe("Muitas tentativas. Tente novamente em alguns minutos.");
      expect(signInWithPassword).toHaveBeenCalledTimes(5);
    } finally {
      currentIp = previousCurrentIp;
    }
  });
});
