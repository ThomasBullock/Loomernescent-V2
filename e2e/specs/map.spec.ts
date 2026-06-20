// Note: tests that verify Google Maps actually initialises (e.g. div[role="application"],
// gmp-place-autocomplete injection) require the API key to allow http://localhost:3001/*.
// Add that referrer to the key's HTTP restrictions in Cloud Console to enable them.

import { test, expect } from "@playwright/test";
import { MapPage } from "../pages/MapPage";

test.describe("/map page", () => {
  test("page loads with correct title", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();
    await expect(page).toHaveTitle(/Map/);
  });

  test("map container is present with data-map-key set", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();
    await expect(mapPage.mapContainer).toBeAttached();
    const key = await mapPage.mapContainer.getAttribute("data-map-key");
    expect(key).toBeTruthy();
  });

  test("autocomplete search container is rendered", async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.goto();
    await expect(mapPage.autocompleteContainer).toBeAttached();
  });
});
