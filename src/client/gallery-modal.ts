export function initGalleryModal(): void {
  const thumbs = document.querySelectorAll<HTMLElement>(".js-gallery-thumb");
  if (thumbs.length === 0) {
    return;
  }

  const modal = document.getElementById("galleryModal");
  if (!modal) {
    return;
  }

  const body = modal.querySelector<HTMLElement>(".modal__body");
  const close = modal.querySelector<HTMLElement>(".modal__close");
  if (!body || !close) {
    return;
  }

  let lastFocus: HTMLElement | null = null;

  const getFocusable = (): HTMLElement[] =>
    Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));

  const trapFocus = (event: KeyboardEvent): void => {
    const focusable = getFocusable();
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.key === "Tab") {
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  };

  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && modal.style.display !== "none") {
      hide();
    }
  };

  const openWith = (largeUrl: string): void => {
    lastFocus = document.activeElement as HTMLElement | null;
    body.replaceChildren();
    const img = document.createElement("img");
    img.src = largeUrl;
    img.alt = "";
    body.appendChild(img);
    modal.style.display = "flex";
    close.focus();
    modal.addEventListener("keydown", trapFocus);
    document.addEventListener("keydown", handleEscape);
  };

  const hide = (): void => {
    modal.style.display = "none";
    body.replaceChildren();
    modal.removeEventListener("keydown", trapFocus);
    document.removeEventListener("keydown", handleEscape);
    if (lastFocus) {
      lastFocus.focus();
      lastFocus = null;
    }
  };

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const largeUrl = thumb.dataset.large;
      if (largeUrl) {
        openWith(largeUrl);
      }
    });
  });

  close.addEventListener("click", hide);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      hide();
    }
  });
}
