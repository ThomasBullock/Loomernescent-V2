import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { ForgotPage } from "../pages/ForgotPage";
import { LayoutPage } from "../pages/LayoutPage";
import { getTestDataSource, closeTestDataSource, truncateTables, createUser } from "../helpers/db";
import type { DataSource } from "typeorm";

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, "users");
});

test.afterAll(async () => {
  await truncateTables(ds, "users");
  await closeTestDataSource();
});

test("forgot form is visible on the login page", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const forgotPage = new ForgotPage(page);

  await loginPage.goto();

  await expect(forgotPage.emailInput).toBeVisible();
  await expect(forgotPage.submitBtn).toBeVisible();
});

test("submitting unknown email → generic success flash", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const forgotPage = new ForgotPage(page);
  const layout = new LayoutPage(page);

  await loginPage.goto();
  await forgotPage.fillEmail("nobody@example.test");
  await forgotPage.submit();

  await expect(page).toHaveURL("/auth/login");
  await layout.expectFlash("success", "If that email matches an account");
});

test("submitting known email → same generic success flash", async ({ page }) => {
  const { user } = await createUser(ds);
  const loginPage = new LoginPage(page);
  const forgotPage = new ForgotPage(page);
  const layout = new LayoutPage(page);

  await loginPage.goto();
  await forgotPage.fillEmail(user.email);
  await forgotPage.submit();

  await expect(page).toHaveURL("/auth/login");
  await layout.expectFlash("success", "If that email matches an account");
});

test("invalid reset token → redirected to login with error", async ({ page }) => {
  const layout = new LayoutPage(page);

  await page.goto("/auth/reset/invalid-token-that-does-not-exist");

  await expect(page).toHaveURL("/auth/login");
  await layout.expectFlash("error", "invalid or has expired");
});
