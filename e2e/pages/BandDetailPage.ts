import { type Page, type Locator, expect } from '@playwright/test';

export class BandDetailPage {
  readonly page: Page;
  readonly nameHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameHeading = page.getByTestId('bands.detail.name');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/band/${slug}`);
  }

  async expectName(text: string): Promise<void> {
    await expect(this.nameHeading).toContainText(text);
  }
}
