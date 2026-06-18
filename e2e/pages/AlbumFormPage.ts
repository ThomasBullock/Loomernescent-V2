import { type Page, type Locator, expect } from "@playwright/test";

export class AlbumFormPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, mode: "add" | "edit") {
    this.page = page;
    const p = `albums.${mode}-form`;
    this.titleInput = page.getByTestId(`${p}.title-input`);
    this.submitBtn = page.getByTestId(`${p}.submit-btn`);
    this.errorMessage = page.getByTestId(`${p}.error-message`);
    this.deleteBtn = page.getByTestId("albums.edit-form.delete-btn");
  }

  async goto(): Promise<void> {
    await this.page.goto("/album/new");
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
