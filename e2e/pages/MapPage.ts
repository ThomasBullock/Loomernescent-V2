import type { Page, Locator } from "@playwright/test";

export class MapPage {
  readonly mapContainer: Locator;
  readonly citySearchInput: Locator;

  constructor(private readonly page: Page) {
    this.mapContainer = page.getByTestId("map.page.map-container");
    this.citySearchInput = page.getByTestId("map.page.city-search-input");
  }

  async goto(): Promise<void> {
    await this.page.goto("/map");
  }
}
