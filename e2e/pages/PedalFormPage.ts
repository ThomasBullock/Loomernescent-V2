import { type Page, type Locator, expect } from "@playwright/test";

export class PedalFormPage {
  readonly page: Page;
  readonly brandInput: Locator;
  readonly nameInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, mode: "add" | "edit") {
    this.page = page;
    const p = `pedals.${mode}-form`;
    this.brandInput = page.getByTestId(`${p}.brand-input`);
    this.nameInput = page.getByTestId(`${p}.name-input`);
    this.submitBtn = page.getByTestId(`${p}.submit-btn`);
    this.errorMessage = page.getByTestId(`${p}.error-message`);
    this.deleteBtn = page.getByTestId(`${p}.delete-btn`);
  }

  async goto(): Promise<void> {
    await this.page.goto("/pedals/new");
  }

  async fill(brand: string, name: string): Promise<void> {
    await this.brandInput.fill(brand);
    await this.nameInput.fill(name);
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }

  async expectError(text: string): Promise<void> {
    await expect(this.errorMessage).toContainText(text);
  }

  async clickDelete(): Promise<void> {
    await this.deleteBtn.click();
  }
}
