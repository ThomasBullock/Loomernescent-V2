import { type Page, type Locator } from "@playwright/test";

export class ForgotPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("auth.forgot-form.email-input");
    this.submitBtn = page.getByTestId("auth.forgot-form.submit-btn");
  }

  async fillEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }
}
