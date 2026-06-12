import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
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

test("valid credentials → redirected to home, user nav shown", async ({ page }) => {
  const { user, password } = await createUser(ds);
  const loginPage = new LoginPage(page);
  const layout = new LayoutPage(page);

  await loginPage.goto();
  await loginPage.login(user.email, password);

  await expect(page).toHaveURL("/");
  expect(await layout.isLoggedIn()).toBe(true);
});

test("wrong password → stays on login, shows error", async ({ page }) => {
  const { user } = await createUser(ds);
  const loginPage = new LoginPage(page);
  const layout = new LayoutPage(page);

  await loginPage.goto();
  await loginPage.login(user.email, "wrongpassword");

  await loginPage.expectOnLoginPage();
  await layout.expectFlash("error", "Invalid email or password");
});

test("unknown email → stays on login, shows error", async ({ page }) => {
  const layout = new LayoutPage(page);
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login("nobody@example.test", "Password1!");

  await loginPage.expectOnLoginPage();
  await layout.expectFlash("error", "Invalid email or password");
});

test("empty submission → stays on login page", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.submit();

  await loginPage.expectOnLoginPage();
});
