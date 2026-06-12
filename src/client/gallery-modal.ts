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

  const openWith = (largeUrl: string) => {
    body.replaceChildren();
    const img = document.createElement("img");
    img.src = largeUrl;
    body.appendChild(img);
    modal.style.display = "flex";
  };

  const hide = () => {
    modal.style.display = "none";
    body.replaceChildren();
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
