import { type Page, type Locator, expect } from "@playwright/test";

export class LayoutPage {
  readonly page: Page;
  readonly logoutBtn: Locator;
  readonly accountLink: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutBtn = page.getByTestId("nav.header.logout-btn");
    this.accountLink = page.getByTestId("nav.header.account-link");
    this.loginLink = page.getByTestId("nav.header.login-link");
    this.registerLink = page.getByTestId("nav.header.register-link");
  }

  async expectFlash(type: "success" | "error", text: string): Promise<void> {
    await expect(this.page.locator(`.flash--${type}`).filter({ hasText: text })).toBeVisible();
  }

  async isLoggedIn(): Promise<boolean> {
    return this.logoutBtn.isVisible();
  }

  async clickLogout(): Promise<void> {
    await this.logoutBtn.click();
  }

  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
  }
}
