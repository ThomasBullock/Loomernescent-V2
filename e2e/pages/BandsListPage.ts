import { type Page, type Locator, expect } from "@playwright/test";

export class BandsListPage {
  readonly page: Page;
  readonly container: Locator;
  readonly editLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("bands.list.table");
    this.editLink = page.getByTestId("bands.list.edit-link").first();
  }

  async goto(): Promise<void> {
    await this.page.goto("/bands");
  }

  async clickEditFirst(): Promise<void> {
    await this.editLink.click();
  }

  async expectContainerVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
  }
}
