import { type Page, type Locator, expect } from '@playwright/test';

export class PedalDetailPage {
  readonly page: Page;
  readonly nameHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameHeading = page.getByTestId('pedals.detail.name');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/pedal/${slug}`);
  }

  async expectName(text: string): Promise<void> {
    await expect(this.nameHeading).toContainText(text);
  }
}
