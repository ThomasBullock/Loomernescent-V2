// Image upload is intentionally not tested here — the Playwright webServer runs the
// real app without mocking ImageKitService. Image upload coverage lives in the
// supertest integration suite: test/pedals.integration-spec.ts

import { test, expect } from "@playwright/test";
import type { DataSource } from "typeorm";
import { AddHubPage } from "../pages/AddHubPage";
import { PedalsListPage } from "../pages/PedalsListPage";
import { PedalDetailPage } from "../pages/PedalDetailPage";
import { PedalFormPage } from "../pages/PedalFormPage";
import { LoginPage } from "../pages/LoginPage";
import { LayoutPage } from "../pages/LayoutPage";
import {
  getTestDataSource,
  closeTestDataSource,
  truncateTables,
  createUser,
  createPedal,
} from "../helpers/db";

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, "pedals");
});

test.afterAll(async () => {
  await truncateTables(ds, "pedals");
  await closeTestDataSource();
});

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

test.describe("public access", () => {
  test("/pedals list renders container", async ({ page }) => {
    await createPedal(ds, { brand: "Boss", name: "DD-8" });
    const listPage = new PedalsListPage(page);
    await listPage.goto();
    await expect(listPage.container).toBeVisible();
  });

  test("/pedal/:slug detail renders name heading", async ({ page }) => {
    const pedal = await createPedal(ds, { brand: "EHX", name: "Big Muff" });
    const detailPage = new PedalDetailPage(page);
    await detailPage.goto(pedal.slug);
    await detailPage.expectName("Big Muff");
  });
});

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test.describe("access control", () => {
  test("anonymous visiting /pedals/new → redirected to /auth/login", async ({ page }) => {
    await page.goto("/pedals/new");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("non-admin visiting /pedals/new → 403", async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: false });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    await page.goto("/pedals/new");
    await expect(page).toHaveURL("/pedals/new");
    expect(await page.title()).not.toContain("Add Pedal");
    // NestJS renders a 403 page — confirm not the add form
    const addForm = new PedalFormPage(page, "add");
    await expect(addForm.brandInput).not.toBeVisible();
  });

  test("admin visiting /pedals/new → form renders", async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const addForm = new PedalFormPage(page, "add");
    await addForm.goto();
    await expect(addForm.brandInput).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// /add hub navigation
// ---------------------------------------------------------------------------

test.describe("/add hub", () => {
  test("admin clicks Add Pedal → lands on /pedals/new", async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const hub = new AddHubPage(page);
    await hub.goto();
    await expect(hub.addPedalLink).toBeVisible();
    await hub.clickAddPedal();

    await expect(page).toHaveURL("/pedals/new");
  });
});

// ---------------------------------------------------------------------------
// Create (admin)
// ---------------------------------------------------------------------------

test.describe("create pedal", () => {
  let adminEmail: string;
  let adminPassword: string;

  test.beforeEach(async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    adminEmail = user.email;
    adminPassword = password;
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminEmail, adminPassword);
  });

  test("valid submission → redirect to detail, flash success", async ({ page }) => {
    const layout = new LayoutPage(page);
    const addForm = new PedalFormPage(page, "add");
    await addForm.goto();
    await addForm.fill("Strymon", "Shimmer");
    await addForm.submit();

    await expect(page).toHaveURL(/\/pedal\/strymon-shimmer/);
    await layout.expectFlash("success", "Strymon Shimmer added");
  });

  test("missing brand → error message, re-renders add form on POST /pedals", async ({ page }) => {
    const addForm = new PedalFormPage(page, "add");
    await addForm.goto();
    await addForm.nameInput.fill("Big Muff Pi");
    await addForm.submit();

    // Form action is POST /pedals — browser URL follows the POST target, not /pedals/new
    await expect(page).toHaveURL("/pedals");
    await addForm.expectError("Brand is required");
  });

  test("missing name → error message, re-renders add form on POST /pedals", async ({ page }) => {
    const addForm = new PedalFormPage(page, "add");
    await addForm.goto();
    await addForm.brandInput.fill("EHX");
    await addForm.submit();

    await expect(page).toHaveURL("/pedals");
    await addForm.expectError("Pedal name is required");
  });
});

// ---------------------------------------------------------------------------
// Edit (admin) — navigates from list card edit icon
// ---------------------------------------------------------------------------

test.describe("edit pedal", () => {
  test.beforeEach(async ({ page }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);
  });

  test("list card edit icon → form pre-fills brand and name", async ({ page }) => {
    await createPedal(ds, { brand: "MXR", name: "Phase 90" });
    const listPage = new PedalsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    await expect(page).toHaveURL(/\/pedals\/.+\/edit/);
    const editForm = new PedalFormPage(page, "edit");
    await expect(editForm.brandInput).toHaveValue("MXR");
    await expect(editForm.nameInput).toHaveValue("Phase 90");
  });

  test("valid update → redirect to detail, flash success", async ({ page }) => {
    await createPedal(ds, { brand: "TC Electronic", name: "Hall of Fame" });
    const layout = new LayoutPage(page);
    const listPage = new PedalsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new PedalFormPage(page, "edit");
    await editForm.nameInput.fill("Hall of Fame 2");
    await editForm.submit();

    await expect(page).toHaveURL(/\/pedal\//);
    await layout.expectFlash("success", "updated");
  });

  test("empty brand → error message, re-renders edit form on POST /pedals/:id", async ({
    page,
  }) => {
    await createPedal(ds, { brand: "Eventide", name: "H9" });
    const listPage = new PedalsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new PedalFormPage(page, "edit");
    await editForm.brandInput.fill("");
    await editForm.submit();

    // Form action is POST /pedals/:id — browser URL follows the POST target, not /edit
    await expect(page).toHaveURL(/\/pedals\/[^/]+$/);
    await editForm.expectError("Brand is required");
  });
});

// ---------------------------------------------------------------------------
// Delete (admin) — navigates from list card edit icon → delete on edit page
// ---------------------------------------------------------------------------

test.describe("delete pedal", () => {
  test("list card edit icon → delete from edit page → redirect to /pedals, flash success", async ({
    page,
  }) => {
    const { user, password } = await createUser(ds, { admin: true });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    await createPedal(ds, { brand: "Death By Audio", name: "Fuzz War" });
    const layout = new LayoutPage(page);
    const listPage = new PedalsListPage(page);
    await listPage.goto();
    await listPage.clickEditFirst();

    const editForm = new PedalFormPage(page, "edit");
    await editForm.clickDelete();

    await expect(page).toHaveURL("/pedals");
    await layout.expectFlash("success", "deleted");
  });
});
