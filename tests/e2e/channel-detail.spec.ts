import { expect, test } from "@playwright/test";

test.describe("Página do canal (PROJECT.md §36)", () => {
  test("abrir um canal a partir da homepage mostra suas informações", async ({ page }) => {
    await page.goto("/");

    const firstCard = page.locator('a[href^="/canal/"]').first();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();

    await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, "\\/") + "$"));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("canal inexistente mostra página de não encontrado", async ({ page }) => {
    await page.goto("/canal/canal-que-com-certeza-nao-existe-zzz");
    await expect(page.getByText("Página não encontrada")).toBeVisible();
  });
});
