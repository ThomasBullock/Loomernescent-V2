// Image upload is intentionally not tested here — the Playwright webServer runs the
// real app without mocking ImageKitService. Image upload coverage lives in the
// supertest integration suite: test/albums.integration-spec.ts

import { test, expect } from "@playwright/test";
import type { DataSource } from "typeorm";
import { AlbumsListPage } from "../pages/AlbumsListPage";
import { AlbumFormPage } from "../pages/AlbumFormPage";
import { LoginPage } from "../pages/LoginPage";
import { LayoutPage } from "../pages/LayoutPage";
import {
  getTestDataSource,
  closeTestDataSource,
  truncateTables,
  createUser,
  createBand,
  createAlbum,
} from "../helpers/db";

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, "albums", "bands", "users");
});

test.afterAll(async () => {
  await truncateTables(ds, "albums", "bands", "users");
  await closeTestDataSource();
});

// ---------------------------------------------------------------------------
// Create (admin)
// ---------------------------------------------------------------------------

test.describe("create album", () => {
  test.beforeEach(async ({ page }) => {
    await truncateTables(ds, "albums", "bands", "users");
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);
  });

  test("valid submission → redirect to detail, flash success", async ({ page }) => {
    await createBand(ds, { name: "Ride", slug: "ride" });
    const layout = new LayoutPage(page);
    const addForm = new AlbumFormPage(page, "add");
    await addForm.goto();
    await addForm.titleInput.fill("Nowhere");
    await page.fill('[name="artist"]', "Ride");
    await addForm.submit();

    await expect(page).toHaveURL(/\/album\/nowhere/);
    await layout.expectFlash("success", "Nowhere");
  });

  test("missing title → error message, re-renders add form on POST /albums", async ({ page }) => {
    const addForm = new AlbumFormPage(page, "add");
    await addForm.goto();
    await addForm.submit();

    // Form action is POST /albums — browser URL follows the POST target, not /album/new
    await expect(page).toHaveURL("/albums");
    await addForm.expectError("Album title is required");
  });
});

// ---------------------------------------------------------------------------
// Edit (admin) — navigates from list card edit icon
// ---------------------------------------------------------------------------

test.describe("edit album", () => {
  test.beforeEach(async ({ page }) => {
    await truncateTables(ds, "albums", "bands", "users");
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);
  });

  test("list card edit icon → form pre-fills title", async ({ page }) => {
    await createAlbum(ds, { title: "Nowhere", slug: "nowhere", artist: "Ride" });
    const listPage = new AlbumsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    await expect(page).toHaveURL(/\/albums\/.+\/edit/);
    const editForm = new AlbumFormPage(page, "edit");
    await expect(editForm.titleInput).toHaveValue("Nowhere");
  });

  test("valid update → redirect to detail, flash success", async ({ page }) => {
    await createAlbum(ds, { title: "Nowhere", slug: "nowhere", artist: "Ride" });
    const layout = new LayoutPage(page);
    const listPage = new AlbumsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new AlbumFormPage(page, "edit");
    await editForm.titleInput.fill("Nowhere (Remaster)");
    await editForm.submit();

    await expect(page).toHaveURL(/\/album\//);
    await layout.expectFlash("success", "updated");
  });

  test("empty title → error message, re-renders edit form on POST /albums/:id", async ({
    page,
  }) => {
    await createAlbum(ds, { title: "Nowhere", slug: "nowhere", artist: "Ride" });
    const listPage = new AlbumsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new AlbumFormPage(page, "edit");
    await editForm.titleInput.fill("");
    await editForm.submit();

    // Form action is POST /albums/:id — browser URL follows the POST target, not /edit
    await expect(page).toHaveURL(/\/albums\/[^/]+$/);
    await editForm.expectError("Album title is required");
  });
});

// ---------------------------------------------------------------------------
// Delete (admin) — navigates from list card edit icon → delete on edit page
// ---------------------------------------------------------------------------

test.describe("delete album", () => {
  test("list card edit icon → delete from edit page → redirect to /albums, flash success", async ({
    page,
  }) => {
    await truncateTables(ds, "albums", "bands", "users");
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    await createAlbum(ds, { title: "Medicine", slug: "medicine", artist: "Medicine" });
    const layout = new LayoutPage(page);
    const listPage = new AlbumsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new AlbumFormPage(page, "edit");
    await editForm.clickDelete();

    await expect(page).toHaveURL("/albums");
    await layout.expectFlash("success", "deleted");
  });
});
