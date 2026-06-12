import { type Page, type Locator, expect } from "@playwright/test";

export class PedalsListPage {
  readonly page: Page;
  readonly container: Locator;
  readonly addLink: Locator;
  readonly editLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("pedals.list.container");
    this.addLink = page.getByTestId("pedals.list.add-link");
    this.editLink = page.getByTestId("pedals.list.edit-link").first();
  }

  async goto(): Promise<void> {
    await this.page.goto("/pedals");
  }

  async expectAddLinkVisible(): Promise<void> {
    await expect(this.addLink).toBeVisible();
  }

  async clickEditFirst(): Promise<void> {
    await this.editLink.click();
  }
}
