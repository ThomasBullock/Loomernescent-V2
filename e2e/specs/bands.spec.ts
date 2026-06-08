// Image upload is intentionally not tested here — the Playwright webServer runs the
// real app without mocking ImageKitService. Image upload coverage lives in the
// supertest integration suite: test/bands.integration-spec.ts

import { test, expect } from '@playwright/test';
import type { DataSource } from 'typeorm';
import { AddHubPage } from '../pages/AddHubPage';
import { BandsListPage } from '../pages/BandsListPage';
import { BandDetailPage } from '../pages/BandDetailPage';
import { BandFormPage } from '../pages/BandFormPage';
import { LoginPage } from '../pages/LoginPage';
import { LayoutPage } from '../pages/LayoutPage';
import {
  getTestDataSource,
  closeTestDataSource,
  truncateTables,
  createUser,
  createBand,
} from '../helpers/db';

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, 'bands');
});

test.afterAll(async () => {
  await truncateTables(ds, 'bands');
  await closeTestDataSource();
});

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

test.describe('public access', () => {
  test('/bands list renders container', async ({ page }) => {
    await createBand(ds, { name: 'Slowdive', slug: 'slowdive' });
    const listPage = new BandsListPage(page);
    await listPage.goto();
    await expect(listPage.container).toBeVisible();
  });

  test('/band/:slug detail renders name heading', async ({ page }) => {
    const band = await createBand(ds, { name: 'Ride', slug: 'ride' });
    const detailPage = new BandDetailPage(page);
    await detailPage.goto(band.slug);
    await detailPage.expectName('Ride');
  });
});

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test.describe('access control', () => {
  test('anonymous visiting /band/new → redirected to /auth/login', async ({
    page,
  }) => {
    await page.goto('/band/new');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('non-admin visiting /band/new → 403', async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: false });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    await page.goto('/band/new');
    await expect(page).toHaveURL('/band/new');
    expect(await page.title()).not.toContain('Add Band');
    // NestJS renders a 403 page — confirm not the add form
    const addForm = new BandFormPage(page, 'add');
    await expect(addForm.nameInput).not.toBeVisible();
  });

  test('admin visiting /band/new → form renders', async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const addForm = new BandFormPage(page, 'add');
    await addForm.goto();
    await expect(addForm.nameInput).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// /add hub navigation
// ---------------------------------------------------------------------------

test.describe('/add hub', () => {
  test('admin clicks Add Band → lands on /band/new', async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const hub = new AddHubPage(page);
    await hub.goto();
    await expect(hub.addBandsLink).toBeVisible();
    await hub.clickAddBand();

    await expect(page).toHaveURL('/band/new');
  });
});

// ---------------------------------------------------------------------------
// Create (admin)
// ---------------------------------------------------------------------------

test.describe('create band', () => {
  test.beforeEach(async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);
  });

  test('valid submission → redirect to detail, flash success', async ({
    page,
  }) => {
    const layout = new LayoutPage(page);
    const addForm = new BandFormPage(page, 'add');
    await addForm.goto();
    await addForm.fill('Cocteau Twins');
    await addForm.submit();

    await expect(page).toHaveURL(/\/band\/cocteau-twins/);
    await layout.expectFlash('success', 'Cocteau Twins added');
  });

  test('missing name → error message, re-renders add form on POST /bands', async ({
    page,
  }) => {
    const addForm = new BandFormPage(page, 'add');
    await addForm.goto();
    await addForm.submit();

    // Form action is POST /bands — browser URL follows the POST target, not /band/new
    await expect(page).toHaveURL('/bands');
    await addForm.expectError('Band name is required');
  });
});
