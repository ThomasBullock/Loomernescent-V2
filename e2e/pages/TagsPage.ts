import { type Page, type Locator, expect } from "@playwright/test";

export class TagsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tagsList: Locator;
  readonly bandsContainer: Locator;
  readonly tagLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByTestId("tags.browse.heading");
    this.tagsList = page.getByTestId("tags.browse.tags-list");
    this.bandsContainer = page.getByTestId("tags.browse.bands-container");
    this.tagLinks = page.getByTestId("tags.browse.tag-link");
  }

  async goto(): Promise<void> {
    await this.page.goto("/tags");
  }

  async gotoTag(tag: string): Promise<void> {
    await this.page.goto(`/tags/${tag}`);
  }

  async clickTag(tag: string): Promise<void> {
    await this.page.locator(`a[href="/tags/${tag}"]`).first().click();
  }

  async expectTagsListVisible(): Promise<void> {
    await expect(this.tagsList).toBeAttached();
  }

  async expectBandsContainerVisible(): Promise<void> {
    await expect(this.bandsContainer).toBeAttached();
  }

  async expectTagLinkActive(tag: string): Promise<void> {
    await expect(this.page.locator(`a.tag__link--active[href="/tags/${tag}"]`)).toBeVisible();
  }
}
