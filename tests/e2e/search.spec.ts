import { expect, test } from "@playwright/test";

test.describe("Busca (PROJECT.md §42)", () => {
  test("buscar um canal existente mostra resultados", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByLabel("Buscar canais");
    await searchInput.fill("globo");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/[?&]q=globo/);
    await expect(page.getByRole("heading", { name: /resultados para/i })).toBeVisible();

    const results = page.locator('a[href^="/canal/"]');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test("buscar algo que não existe mostra o estado vazio", async ({ page }) => {
    await page.goto("/?q=zzz-canal-que-nao-existe-de-verdade-zzz");

    await expect(page.getByText("Nenhum canal encontrado")).toBeVisible();
  });
});
