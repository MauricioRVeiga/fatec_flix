import { expect, test } from "@playwright/test";

test.describe("Categorias (PROJECT.md §43)", () => {
  test("trocar de categoria pela home leva pra /categoria/[slug] com os canais certos", async ({
    page,
  }) => {
    await page.goto("/");

    const categoryLink = page.locator('a[href^="/categoria/"]').first();
    const href = await categoryLink.getAttribute("href");
    await categoryLink.click();

    await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, "\\/") + "$"));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = page.locator('a[href^="/canal/"]');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test("categoria com slug inexistente mostra não encontrado", async ({ page }) => {
    await page.goto("/categoria/categoria-que-nao-existe-de-verdade-zzz");
    await expect(page.getByText("Página não encontrada")).toBeVisible();
  });
});
