import { test, expect } from "@playwright/test";
import { MapPage } from "../pages/MapPage";

test.describe("/map page", () => {
  test("Google Maps initialises — map application div is injected", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();

    // Google Maps injects div[role="application"] inside the container when
    // the map successfully initialises. This only appears if the API key is
    // valid and importLibrary() resolves without error.
    await expect(
      page.locator('[data-testid="map.page.map-container"] div[role="application"]'),
    ).toBeVisible({ timeout: 15000 });
  });

  test("city search input is visible", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();
    await expect(mapPage.citySearchInput).toBeVisible();
  });

  test("city search input accepts text without submitting the form", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();
    await mapPage.citySearchInput.fill("London");
    // pressing Enter should not navigate away (keydown preventDefault)
    await mapPage.citySearchInput.press("Enter");
    await expect(page).toHaveURL("/map");
    await expect(mapPage.citySearchInput).toHaveValue("London");
  });
});
