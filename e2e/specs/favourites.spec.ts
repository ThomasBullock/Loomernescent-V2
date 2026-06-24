import { test, expect } from "@playwright/test";
import type { DataSource } from "typeorm";
import { FavouritesPage } from "../pages/FavouritesPage";
import { BandsListPage } from "../pages/BandsListPage";
import { LoginPage } from "../pages/LoginPage";
import {
  getTestDataSource,
  closeTestDataSource,
  truncateTables,
  createUser,
  createBand,
  createAlbum,
  createFavourite,
} from "../helpers/db";

let ds: DataSource;

test.beforeAll(async () => {
  ds = await getTestDataSource();
});

test.afterAll(async () => {
  await truncateTables(ds, "favourites", "albums", "bands", "users");
  await closeTestDataSource();
});

test.beforeEach(async () => {
  await truncateTables(ds, "favourites", "albums", "bands", "users");
});

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test.describe("access control", () => {
  test("anonymous visiting /favourites → redirected to /auth/login", async ({ page }) => {
    await page.goto("/favourites");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ---------------------------------------------------------------------------
// Favourites page
// ---------------------------------------------------------------------------

test.describe("favourites page", () => {
  test("renders section headings for authenticated user", async ({ page }) => {
    const { user, password } = await createUser(ds);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const favPage = new FavouritesPage(page);
    await favPage.goto();

    await favPage.expectSectionsVisible();
  });

  test("shows favourited band on the page", async ({ page }) => {
    const { user, password } = await createUser(ds);
    const band = await createBand(ds, { name: "Ride", slug: "ride", authorId: user.id });
    await createFavourite(ds, { userId: user.id, bandId: band.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const favPage = new FavouritesPage(page);
    await favPage.goto();

    await favPage.expectBandVisible("Ride");
  });

  test("shows favourited album on the page", async ({ page }) => {
    const { user, password } = await createUser(ds);
    const band = await createBand(ds, { authorId: user.id });
    const album = await createAlbum(ds, {
      title: "Nowhere",
      slug: "nowhere",
      artist: "Ride",
      bandId: band.id,
    });
    await createFavourite(ds, { userId: user.id, albumId: album.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const favPage = new FavouritesPage(page);
    await favPage.goto();

    await favPage.expectAlbumVisible("Nowhere");
  });
});

// ---------------------------------------------------------------------------
// Heart toggle
// ---------------------------------------------------------------------------

test.describe("heart toggle", () => {
  test("clicking heart on a band card marks it as hearted", async ({ page }) => {
    const { user, password } = await createUser(ds);
    await createBand(ds, { name: "Lush", slug: "lush", authorId: user.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const listPage = new BandsListPage(page);
    await listPage.goto();

    const heartBtn = page.getByTestId("bands.list.heart-btn").first();
    await expect(heartBtn).not.toHaveClass(/heart__button--hearted/);
    await heartBtn.click();

    // After form submit + redirect the heart button should be hearted
    await expect(page.getByTestId("bands.list.heart-btn").first()).toHaveClass(
      /heart__button--hearted/,
    );
  });

  test("clicking heart on a hearted band card removes the heart", async ({ page }) => {
    const { user, password } = await createUser(ds);
    const band = await createBand(ds, { name: "Lush", slug: "lush", authorId: user.id });
    await createFavourite(ds, { userId: user.id, bandId: band.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    const listPage = new BandsListPage(page);
    await listPage.goto();

    const heartBtn = page.getByTestId("bands.list.heart-btn").first();
    await expect(heartBtn).toHaveClass(/heart__button--hearted/);
    await heartBtn.click();

    await expect(page.getByTestId("bands.list.heart-btn").first()).not.toHaveClass(
      /heart__button--hearted/,
    );
  });

  test("favouriting a band adds it to /favourites page", async ({ page }) => {
    const { user, password } = await createUser(ds);
    await createBand(ds, { name: "Chapterhouse", slug: "chapterhouse", authorId: user.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    // Heart the band on the list page
    const listPage = new BandsListPage(page);
    await listPage.goto();
    await page.getByTestId("bands.list.heart-btn").first().click();

    // Navigate to /favourites and verify it appears
    const favPage = new FavouritesPage(page);
    await favPage.goto();
    await favPage.expectBandVisible("Chapterhouse");
  });

  test("unfavouriting a band removes it from /favourites page", async ({ page }) => {
    const { user, password } = await createUser(ds);
    const band = await createBand(ds, {
      name: "Chapterhouse",
      slug: "chapterhouse",
      authorId: user.id,
    });
    await createFavourite(ds, { userId: user.id, bandId: band.id });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, password);

    // Un-heart the band on the list page
    const listPage = new BandsListPage(page);
    await listPage.goto();
    await page.getByTestId("bands.list.heart-btn").first().click();

    // Navigate to /favourites and verify it is gone
    const favPage = new FavouritesPage(page);
    await favPage.goto();
    await favPage.expectBandAbsent("Chapterhouse");
  });
});
