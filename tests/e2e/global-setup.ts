import { chromium, type FullConfig } from "@playwright/test";

export const STORAGE_STATE_PATH = "playwright/.auth/admin.json";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL e E2E_ADMIN_PASSWORD (.env/.env.local) são obrigatórios pra rodar " +
        "a suíte E2E — ver README 'Rodar os testes E2E'."
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(`${baseURL}/`);

    await page.context().storageState({ path: STORAGE_STATE_PATH });
  } finally {
    await browser.close();
  }
}
