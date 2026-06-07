import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { LayoutPage } from '../pages/LayoutPage';
import {
  getTestDataSource,
  closeTestDataSource,
  truncateTables,
  createUser,
} from '../helpers/db';
import type { DataSource } from 'typeorm';

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, 'users');
});

test.afterAll(async () => {
  await truncateTables(ds, 'users');
  await closeTestDataSource();
});

test('logged-in user logs out → redirected to login, user nav gone', async ({
  page,
}) => {
  const { user, password } = await createUser(ds);
  const loginPage = new LoginPage(page);
  const layout = new LayoutPage(page);

  // Log in first
  await loginPage.goto();
  await loginPage.login(user.email, password);
  await expect(page).toHaveURL('/');
  expect(await layout.isLoggedIn()).toBe(true);

  // Log out
  await layout.clickLogout();

  await expect(page).toHaveURL('/auth/login');
  await layout.expectFlash('success', 'You have been logged out');
  expect(await layout.isLoggedIn()).toBe(false);
  await expect(layout.loginLink).toBeVisible();
});
