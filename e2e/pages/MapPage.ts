import type { Page, Locator } from "@playwright/test";

export class MapPage {
  readonly mapContainer: Locator;
  readonly autocompleteContainer: Locator;

  constructor(private readonly page: Page) {
    this.mapContainer = page.getByTestId("map.page.map-container");
    this.autocompleteContainer = page.locator(".autocomplete");
  }

  async goto(): Promise<void> {
    await this.page.goto("/map");
  }
}
