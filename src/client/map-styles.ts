export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ saturation: 36 }, { color: "#000000" }, { lightness: 40 }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#000000" }, { lightness: 16 }],
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.fill",
    stylers: [{ color: "#000000" }, { lightness: 20 }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#000000" }, { lightness: 17 }, { weight: 1.2 }],
  },
  {
    featureType: "administrative.province",
    elementType: "labels.text.fill",
    stylers: [{ lightness: "65" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#000000" }, { lightness: 20 }],
  },
  {
    featureType: "landscape",
    elementType: "geometry.fill",
    stylers: [{ saturation: "-28" }, { lightness: "0" }],
  },
  {
    featureType: "landscape.natural.terrain",
    elementType: "geometry.fill",
    stylers: [{ lightness: "0" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#000000" }, { lightness: 21 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#000000" }, { lightness: 17 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#000000" }, { lightness: 29 }, { weight: 0.2 }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#000000" }, { lightness: 18 }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#000000" }, { lightness: 16 }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#000000" }, { lightness: 19 }],
  },
  {
    featureType: "water",
    elementType: "all",
    stylers: [{ color: "#612ef2" }, { visibility: "on" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      { color: "#612ef2" },
      { lightness: "5" },
      { visibility: "on" },
      { gamma: "0.94" },
      { saturation: "13" },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ visibility: "on" }, { color: "#9151be" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#eadfea" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
];
