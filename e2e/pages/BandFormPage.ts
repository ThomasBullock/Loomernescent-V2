import { type Page, type Locator, expect } from '@playwright/test';

export class BandFormPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, mode: 'add' | 'edit') {
    this.page = page;
    const p = `bands.${mode}-form`;
    this.nameInput = page.getByTestId(`${p}.name-input`);
    this.submitBtn = page.getByTestId(`${p}.submit-btn`);
    this.errorMessage = page.getByTestId(`${p}.error-message`);
  }

  async goto(): Promise<void> {
    await this.page.goto('/band/new');
  }

  async fill(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.errorMessage).toContainText(text);
  }
}
