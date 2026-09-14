import { expect, test } from "@playwright/test";

test.describe("Login e painel administrativo (PROJECT.md §82)", () => {
  test("/admin sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "Fatec Flix" })).toBeVisible();
  });

  test("qualquer página do site sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\?next=%2F$/);
  });

  test("login com credenciais inválidas mostra erro genérico e não entra", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("nao-existe@example.com");
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("página pública não mostra a busca/favoritos do catálogo em /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("Buscar canais...")).toHaveCount(0);
  });
});
