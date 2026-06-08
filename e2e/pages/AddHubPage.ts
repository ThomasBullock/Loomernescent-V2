import { type Page, type Locator } from '@playwright/test';

export class AddHubPage {
  readonly page: Page;
  readonly addBandsLink: Locator;
  readonly addPedalLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBandsLink = page.getByTestId('add.hub.bands-link');
    this.addPedalLink = page.getByTestId('add.hub.pedals-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/add');
  }

  async clickAddBand(): Promise<void> {
    await this.addBandsLink.click();
  }

  async clickAddPedal(): Promise<void> {
    await this.addPedalLink.click();
  }
}
