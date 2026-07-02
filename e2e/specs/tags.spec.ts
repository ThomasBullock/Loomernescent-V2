import { test, expect } from "@playwright/test";
import type { DataSource } from "typeorm";
import { TagsPage } from "../pages/TagsPage";
import { LayoutPage } from "../pages/LayoutPage";
import { getTestDataSource, closeTestDataSource, truncateTables, createBand } from "../helpers/db";

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
  await truncateTables(ds, "bands", "users");
});

test.afterAll(async () => {
  await truncateTables(ds, "bands", "users");
  await closeTestDataSource();
});

test.beforeEach(async () => {
  await truncateTables(ds, "bands", "users");
});

// ---------------------------------------------------------------------------
// Public access
// ---------------------------------------------------------------------------

test.describe("public access", () => {
  test("/tags renders the tags list container", async ({ page }) => {
    const tagsPage = new TagsPage(page);
    await tagsPage.goto();
    await tagsPage.expectTagsListVisible();
  });

  test("/tags renders the bands container", async ({ page }) => {
    const tagsPage = new TagsPage(page);
    await tagsPage.goto();
    await tagsPage.expectBandsContainerVisible();
  });

  test("/tags shows tag picks from seeded bands", async ({ page }) => {
    await createBand(ds, {
      name: "Slowdive",
      slug: "slowdive",
      tags: ["Ethereal"],
    });

    const tagsPage = new TagsPage(page);
    await tagsPage.goto();

    await expect(tagsPage.tagLinks.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

test.describe("navigation", () => {
  test("tags nav link navigates to /tags", async ({ page }) => {
    const layout = new LayoutPage(page);
    await page.goto("/");
    await layout.tagsLink.click();
    await expect(page).toHaveURL(/\/tags$/);
  });
});

// ---------------------------------------------------------------------------
// Filtering by tag
// ---------------------------------------------------------------------------

test.describe("tag filtering", () => {
  test("clicking a tag link navigates to /tags/:tag", async ({ page }) => {
    await createBand(ds, {
      name: "Slowdive",
      slug: "slowdive",
      tags: ["Ethereal"],
    });

    const tagsPage = new TagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickTag("Ethereal");

    await expect(page).toHaveURL(/\/tags\/Ethereal$/);
  });

  test("/tags/:tag shows only matching bands", async ({ page }) => {
    await createBand(ds, {
      name: "Slowdive",
      slug: "slowdive",
      tags: ["Ethereal"],
    });
    await createBand(ds, {
      name: "Ringo Deathstarr",
      slug: "ringo-deathstarr",
      tags: ["Noughties"],
    });

    const tagsPage = new TagsPage(page);
    await tagsPage.gotoTag("Ethereal");

    await expect(tagsPage.bandsContainer).toContainText("Slowdive");
    await expect(tagsPage.bandsContainer).not.toContainText("Ringo Deathstarr");
  });

  test("/tags/:tag marks the active tag link", async ({ page }) => {
    await createBand(ds, {
      name: "Slowdive",
      slug: "slowdive",
      tags: ["Ethereal"],
    });

    const tagsPage = new TagsPage(page);
    await tagsPage.gotoTag("Ethereal");
    await tagsPage.expectTagLinkActive("Ethereal");
  });

  test("/tags shows all bands that have at least one tag", async ({ page }) => {
    await createBand(ds, {
      name: "Slowdive",
      slug: "slowdive",
      tags: ["Ethereal"],
    });
    await createBand(ds, {
      name: "Ride",
      slug: "ride",
      tags: [],
    });

    const tagsPage = new TagsPage(page);
    await tagsPage.goto();

    await expect(tagsPage.bandsContainer).toContainText("Slowdive");
    await expect(tagsPage.bandsContainer).not.toContainText("Ride");
  });
});
