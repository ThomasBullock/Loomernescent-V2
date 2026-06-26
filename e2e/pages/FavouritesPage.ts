import { type Page, type Locator, expect } from "@playwright/test";

export class FavouritesPage {
  readonly page: Page;
  readonly bandsSection: Locator;
  readonly albumsSection: Locator;
  readonly pedalsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bandsSection = page.getByTestId("favourites.page.bands-section");
    this.albumsSection = page.getByTestId("favourites.page.albums-section");
    this.pedalsSection = page.getByTestId("favourites.page.pedals-section");
  }

  async goto(): Promise<void> {
    await this.page.goto("/favourites");
  }

  async expectSectionsVisible(): Promise<void> {
    await expect(this.bandsSection).toBeVisible();
    await expect(this.albumsSection).toBeVisible();
    await expect(this.pedalsSection).toBeVisible();
  }

  async expectBandVisible(name: string): Promise<void> {
    await expect(this.page.locator(".bands").getByText(name)).toBeVisible();
  }

  async expectAlbumVisible(title: string): Promise<void> {
    await expect(this.page.locator(".albums").getByText(title)).toBeVisible();
  }

  async expectPedalVisible(name: string): Promise<void> {
    await expect(this.page.locator(".pedals").getByText(name)).toBeVisible();
  }

  async expectBandAbsent(name: string): Promise<void> {
    await expect(this.page.locator(".bands").getByText(name)).not.toBeVisible();
  }
}
