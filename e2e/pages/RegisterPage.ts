import { type Page, type Locator, expect } from "@playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId("auth.register-form.name-input");
    this.emailInput = page.getByTestId("auth.register-form.email-input");
    this.passwordInput = page.getByTestId("auth.register-form.password-input");
    this.passwordConfirmInput = page.locator('input[name="password-confirm"]');
    this.submitBtn = page.getByTestId("auth.register-form.submit-btn");
    this.errorMessage = page.getByTestId("auth.register-form.error-message");
  }

  async goto(): Promise<void> {
    await this.page.goto("/auth/register");
  }

  async fill(name: string, email: string, password: string, confirm: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordConfirmInput.fill(confirm);
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.errorMessage.first()).toContainText(text);
  }
}
