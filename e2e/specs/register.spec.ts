import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
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

test('valid registration → redirected to home, welcome flash shown', async ({
  page,
}) => {
  const registerPage = new RegisterPage(page);
  const layout = new LayoutPage(page);

  await registerPage.goto();
  await registerPage.fill(
    'New User',
    `new-${Date.now()}@example.test`,
    'Password1!',
    'Password1!',
  );
  await registerPage.submit();

  await expect(page).toHaveURL('/');
  await layout.expectFlash('success', 'Welcome to Loomernescent');
  expect(await layout.isLoggedIn()).toBe(true);
});

test('duplicate email → re-renders register with error', async ({ page }) => {
  const { user } = await createUser(ds);
  const registerPage = new RegisterPage(page);

  await registerPage.goto();
  await registerPage.fill('Another', user.email, 'Password1!', 'Password1!');
  await registerPage.submit();

  await expect(page).toHaveURL('/auth/register');
  await registerPage.expectError('already registered');
});

test('password mismatch → re-renders register with error', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await registerPage.goto();
  await registerPage.fill(
    'Test',
    `mismatch-${Date.now()}@example.test`,
    'Password1!',
    'different',
  );
  await registerPage.submit();

  await expect(page).toHaveURL('/auth/register');
  await registerPage.expectError('do not match');
});

test('password too short → re-renders register with error', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await registerPage.goto();
  await registerPage.fill(
    'Test',
    `short-${Date.now()}@example.test`,
    'short',
    'short',
  );
  await registerPage.submit();

  await expect(page).toHaveURL('/auth/register');
  await registerPage.expectError('8 characters');
});

test('honeypot field filled → 400 response', async ({ page }) => {
  await page.goto('/auth/register');
  await page.locator('input[name="stratosphere"]').evaluate(
    (el: HTMLInputElement) => { el.value = 'bot-value'; },
  );
  await page.locator('input[name="name"]').fill('Bot');
  await page.locator('input[name="email"]').fill('bot@example.test');
  await page.locator('input[name="password"]').fill('Password1!');
  await page.locator('input[name="password-confirm"]').fill('Password1!');

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/register') && res.request().method() === 'POST'),
    page.getByTestId('auth.register-form.submit-btn').click(),
  ]);

  expect(response.status()).toBe(400);
});
