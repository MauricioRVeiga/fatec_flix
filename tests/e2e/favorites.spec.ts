import { expect, test } from "@playwright/test";

test.describe("Favoritos (PROJECT.md §13/§44)", () => {
  test("sem favoritos, mostra o estado vazio exato do §44", async ({ page }) => {
    await page.goto("/favoritos");
    await expect(
      page.getByText("Você ainda não adicionou canais aos favoritos.")
    ).toBeVisible();
  });

  test("favoritar um canal na home faz ele aparecer em /favoritos", async ({ page }) => {
    await page.goto("/");

    const firstCard = page.locator('a[href^="/canal/"]').first();
    const channelHref = await firstCard.getAttribute("href");

    const favoriteButton = firstCard.getByRole("button", { name: /adicionar .* aos favoritos/i });
    await favoriteButton.click();
    await expect(page).toHaveURL("/");

    await page.goto("/favoritos");
    await expect(
      page.getByText("Você ainda não adicionou canais aos favoritos.")
    ).not.toBeVisible();
    await expect(page.locator(`a[href="${channelHref}"]`).first()).toBeVisible();
  });

  test("desfavoritar remove da lista", async ({ page }) => {
    await page.goto("/");

    const firstCard = page.locator('a[href^="/canal/"]').first();
    const favoriteButton = firstCard.getByRole("button", { name: /adicionar .* aos favoritos/i });
    await favoriteButton.click();

    await page.goto("/favoritos");
    const unfavoriteButton = page
      .locator('a[href^="/canal/"]')
      .first()
      .getByRole("button", { name: /remover .* dos favoritos/i });
    await unfavoriteButton.click();

    await expect(
      page.getByText("Você ainda não adicionou canais aos favoritos.")
    ).toBeVisible();
  });
});
