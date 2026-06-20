import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface BandMapItem {
  name: string;
  slug: string;
  locationLat: number;
  locationLng: number;
  locationAddress: string | null;
  imagePath: string | null;
}

async function loadBands(lat?: number, lng?: number): Promise<BandMapItem[]> {
  const url = new URL("/api/bands/map", location.origin);
  if (lat !== undefined && lng !== undefined) {
    url.searchParams.set("location_lat", String(lat));
    url.searchParams.set("location_lng", String(lng));
  }
  console.log(url);
  const res = await fetch(url.toString());
  if (!res.ok) {
    return [];
  }
  return res.json() as Promise<BandMapItem[]>;
}

function buildPopupElement(band: BandMapItem, ikUrl: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "popup";

  const link = document.createElement("a");
  link.href = `/band/${band.slug}`;

  if (band.imagePath) {
    const img = document.createElement("img");
    img.src = `${ikUrl}${band.imagePath}`;
    img.alt = ""; // decorative — link text below is the accessible name
    link.appendChild(img);
  }

  const name = document.createElement("strong");
  name.textContent = band.name;
  link.appendChild(name);

  wrapper.appendChild(link);
  return wrapper;
}

async function initMap(): Promise<void> {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    return;
  }

  const { mapKey = "", mapId = "DEMO_MAP_ID", ikUrl = "" } = mapDiv.dataset;

  setOptions({ key: mapKey, v: "weekly" });

  const [
    { Map, InfoWindow },
    { LatLngBounds },
    { AdvancedMarkerElement },
    { PlaceAutocompleteElement },
  ] = await Promise.all([
    importLibrary("maps"),
    importLibrary("core"),
    importLibrary("marker"),
    importLibrary("places"),
  ]);

  const map = new Map(mapDiv, {
    center: { lat: 43.2, lng: 0 },
    zoom: 5,
    mapId,
  });

  const infoWindow = new InfoWindow();
  let activeMarkers: InstanceType<typeof AdvancedMarkerElement>[] = [];

  function drawMarkers(bands: BandMapItem[]) {
    activeMarkers.forEach((m) => (m.map = null));
    activeMarkers = [];
    infoWindow.close();

    if (bands.length === 0) {
      return;
    }

    const bounds = new LatLngBounds();
    bands.forEach((band) => {
      const position = { lat: band.locationLat, lng: band.locationLng };
      bounds.extend(position);

      const marker = new AdvancedMarkerElement({ map, position });
      activeMarkers.push(marker);

      marker.addListener("click", () => {
        infoWindow.setContent(buildPopupElement(band, ikUrl));
        infoWindow.open(map, marker);
      });
    });

    map.fitBounds(bounds);
    if (bands.length === 1) {
      map.setZoom(6);
    }
  }

  drawMarkers(await loadBands());

  const searchContainer = document.querySelector<HTMLElement>(".autocomplete");
  if (searchContainer) {
    const autocomplete = new PlaceAutocompleteElement({ includedPrimaryTypes: ["locality"] });
    autocomplete.placeholder = "Search cities for Shoegaze bands...";
    searchContainer.appendChild(autocomplete);

    autocomplete.addEventListener("gmp-select", ({ placePrediction }) => {
      void (async () => {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["location"] });
        if (!place.location) {
          return;
        }
        const lat = place.location.lat();
        const lng = place.location.lng();
        map.setCenter({ lat, lng });
        map.setZoom(8);
        const bands = await loadBands(lat, lng);
        drawMarkers(bands);
      })();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void initMap();
});
