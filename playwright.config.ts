import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

const port = 3001;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npx ts-node -r tsconfig-paths/register src/main.ts",
    url: `${baseURL}/auth/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      PORT: String(port),
      NODE_ENV: "test",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "test-session-secret",
      MAIL_FROM: process.env.MAIL_FROM ?? "test@example.com",
      MAILGUN_SMTP_HOST: process.env.MAILGUN_SMTP_HOST ?? "localhost",
      MAILGUN_SMTP_PORT: process.env.MAILGUN_SMTP_PORT ?? "1025",
      MAILGUN_SMTP_LOGIN: process.env.MAILGUN_SMTP_LOGIN ?? "",
      MAILGUN_SMTP_PASSWORD: process.env.MAILGUN_SMTP_PASSWORD ?? "",
    },
  },
});
