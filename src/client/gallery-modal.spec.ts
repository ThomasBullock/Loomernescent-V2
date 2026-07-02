/**
 * @jest-environment jsdom
 *
 * Client-side unit tests for gallery-modal.ts.
 * Uses jsdom (via the docblock above) so DOM APIs are available.
 * Runs as part of `npm run test` — no separate config needed.
 */
import { initGalleryModal } from './gallery-modal';

const buildDOM = (): void => {
  document.body.innerHTML = `
    <button class="gallery-thumb-btn js-gallery-thumb"
            data-large="/large.jpg"
            aria-label="View photo">
      <img src="/thumb.jpg" alt="">
    </button>
    <div id="galleryModal" style="display:none"
         role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title">
      <div class="modal__container">
        <h3 id="gallery-modal-title" class="modal__title">Band</h3>
        <button class="modal__close" type="button" aria-label="Close gallery">×</button>
        <div class="modal__body"></div>
      </div>
    </div>
  `;
};

describe('initGalleryModal', () => {
  let modal: HTMLElement;
  let thumb: HTMLButtonElement;
  let close: HTMLButtonElement;
  let body: HTMLElement;

  beforeEach(() => {
    buildDOM();
    modal = document.getElementById('galleryModal') as HTMLElement;
    thumb = document.querySelector('.js-gallery-thumb') as HTMLButtonElement;
    close = document.querySelector('.modal__close') as HTMLButtonElement;
    body = document.querySelector('.modal__body') as HTMLElement;
    initGalleryModal();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // --- guard clauses ---

  it('returns early when no thumbs are present', () => {
    document.body.innerHTML = '';
    expect(() => initGalleryModal()).not.toThrow();
  });

  it('returns early when #galleryModal is absent', () => {
    document.body.innerHTML =
      '<button class="js-gallery-thumb" data-large="/x.jpg"></button>';
    expect(() => initGalleryModal()).not.toThrow();
  });

  // --- open ---

  it('makes the modal visible on thumb click', () => {
    thumb.click();
    expect(modal.style.display).toBe('flex');
  });

  it('injects the large image into the modal body', () => {
    thumb.click();
    const img = body.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toContain('/large.jpg');
    expect(img!.alt).toBe('');
  });

  it('moves focus to the close button on open', () => {
    thumb.focus();
    thumb.click();
    expect(document.activeElement).toBe(close);
  });

  it('does not open when data-large is missing', () => {
    thumb.removeAttribute('data-large');
    thumb.click();
    expect(modal.style.display).toBe('none');
  });

  // --- close via button ---

  it('hides the modal on close-button click', () => {
    thumb.click();
    close.click();
    expect(modal.style.display).toBe('none');
  });

  it('empties the modal body on close', () => {
    thumb.click();
    close.click();
    expect(body.children).toHaveLength(0);
  });

  it('restores focus to the trigger on close', () => {
    thumb.focus();
    thumb.click();
    close.click();
    expect(document.activeElement).toBe(thumb);
  });

  // --- close via backdrop click ---

  it('closes when clicking the modal backdrop directly', () => {
    thumb.click();
    const evt = new MouseEvent('click', { bubbles: false });
    Object.defineProperty(evt, 'target', { value: modal, writable: false });
    modal.dispatchEvent(evt);
    expect(modal.style.display).toBe('none');
  });

  it('does not close when clicking inside modal content', () => {
    thumb.click();
    const evt = new MouseEvent('click', { bubbles: false });
    Object.defineProperty(evt, 'target', { value: close, writable: false });
    modal.dispatchEvent(evt);
    expect(modal.style.display).toBe('flex');
  });

  // --- Escape key ---

  it('closes on Escape when open', () => {
    thumb.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.style.display).toBe('none');
  });

  it('does not throw on Escape when modal is already closed', () => {
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }).not.toThrow();
  });

  it('removes the Escape listener after close', () => {
    thumb.click();
    close.click();
    // Second Escape should not error and modal stays hidden
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.style.display).toBe('none');
  });

  // --- focus trap ---

  it('trapFocus: Tab on last focusable wraps to first', () => {
    thumb.click();
    // close is the only focusable element; should wrap back to itself
    close.focus();
    modal.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(close);
  });

  it('trapFocus: Shift+Tab on first focusable wraps to last', () => {
    thumb.click();
    close.focus();
    modal.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(close);
  });

  it('trapFocus: non-Tab keydown in modal does nothing', () => {
    thumb.click();
    close.focus();
    expect(() => {
      modal.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    }).not.toThrow();
    expect(document.activeElement).toBe(close);
  });

  it('trapFocus: handles empty focusable list gracefully', () => {
    thumb.click();
    // Disable the only focusable element
    close.setAttribute('disabled', '');
    expect(() => {
      modal.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
    }).not.toThrow();
  });
});
