import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface BandMapItem {
  name: string;
  slug: string;
  locationLat: number;
  locationLng: number;
  locationAddress: string | null;
  imagePath: string | null;
}

async function loadBands(): Promise<BandMapItem[]> {
  const res = await fetch("/api/bands/map");
  if (!res.ok) return [];
  return res.json() as Promise<BandMapItem[]>;
}

function buildPopupHtml(band: BandMapItem, ikUrl: string): string {
  const img = band.imagePath
    ? `<img src="${ikUrl}${band.imagePath}" alt="${band.name}" />`
    : "";
  return `<div class="popup">
    <a href="/band/${band.slug}">
      ${img}
      <p><strong>${band.name}</strong></p>
    </a>
  </div>`;
}

async function initMap(): Promise<void> {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  const { mapKey = "", mapId = "DEMO_MAP_ID", ikUrl = "" } = (mapDiv as HTMLElement).dataset;

  setOptions({ key: mapKey, v: "weekly" });

  const [{ Map, InfoWindow }, { AdvancedMarkerElement }, { Autocomplete }] =
    await Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("places"),
    ]);

  const map = new Map(mapDiv, {
    center: { lat: 43.2, lng: 0 },
    zoom: 5,
    mapId,
  });

  const infoWindow = new InfoWindow();
  const bands = await loadBands();

  if (bands.length > 0) {
    const bounds = new google.maps.LatLngBounds();

    bands.forEach((band) => {
      const position = { lat: band.locationLat, lng: band.locationLng };
      bounds.extend(position);

      const marker = new AdvancedMarkerElement({ map, position });

      marker.addListener("click", () => {
        infoWindow.setContent(buildPopupHtml(band, ikUrl));
        infoWindow.open(map, marker);
      });
    });

    map.fitBounds(bounds);

    if (bands.length === 1) {
      map.setZoom(6);
    }
  }

  const searchInput = document.querySelector<HTMLInputElement>('[name="geolocate"]');
  if (searchInput) {
    const autocomplete = new Autocomplete(searchInput, { types: ["(cities)"] });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      map.setCenter(place.geometry.location);
      map.setZoom(8);
    });

    searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") e.preventDefault();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void initMap();
});
