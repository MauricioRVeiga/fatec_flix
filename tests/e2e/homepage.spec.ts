import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("carrega, mostra o header e pelo menos um canal", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Fatec Flix" })).toBeVisible();
    await expect(page.getByLabel("Buscar canais")).toBeVisible();

    const channelCards = page.locator('a[href^="/canal/"]');
    await expect(channelCards.first()).toBeVisible();
    expect(await channelCards.count()).toBeGreaterThan(0);
  });

  test("usa tema escuro por padrão (PROJECT.md §64)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("alternar tema tira a classe dark do html", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ativar tema/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
