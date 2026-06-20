import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

document.addEventListener("DOMContentLoaded", () => {
  void (async () => {
    const addressInput = document.querySelector<HTMLInputElement>("#address");
    if (!addressInput) {
      return;
    }

    const latInput = document.querySelector<HTMLInputElement>("#lat");
    const lngInput = document.querySelector<HTMLInputElement>("#lng");

    setOptions({ key: addressInput.dataset.mapKey ?? "", v: "weekly" });

    const { PlaceAutocompleteElement } = await importLibrary("places");

    const autocompleteEl = new PlaceAutocompleteElement({
      includedPrimaryTypes: ["locality"],
      // Pre-populate with existing address in edit mode
      value: addressInput.value,
    });

    // Hide original input — keeps name="locationAddress" in form submission.
    // Value is preserved as-is, or updated when the user picks a new place.
    addressInput.hidden = true;
    addressInput.before(autocompleteEl);

    autocompleteEl.addEventListener("gmp-select", (event) => {
      // addEventListener expects its callback to return void so
      // The correct fix is to keep the async callback but wrap it in a synchronous void-returning wrapper that explicitly handles the rejected promise:
      // Lipstick on a fucking pig
      void (async () => {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        addressInput.value = place.formattedAddress ?? "";
        if (latInput) {
          latInput.value = String(place.location?.lat() ?? "");
        }
        if (lngInput) {
          lngInput.value = String(place.location?.lng() ?? "");
        }
      })();
    });

    autocompleteEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });
  })();
});
