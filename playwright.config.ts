import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE_PATH } from "./tests/e2e/global-setup";

for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "authenticated",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE_PATH },
      testIgnore: /admin\.spec\.ts/,
    },
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /admin\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
