import { type Page, type Locator } from '@playwright/test';

export class AddHubPage {
  readonly page: Page;
  readonly addPedalLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addPedalLink = page.getByTestId('add.hub.pedals-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/add');
  }

  async clickAddPedal(): Promise<void> {
    await this.addPedalLink.click();
  }
}
