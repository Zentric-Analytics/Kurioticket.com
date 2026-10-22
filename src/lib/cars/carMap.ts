function normalizeLocation(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function buildGoogleCarMapEmbedUrl({
  pickupLocation,
  googleMapsEmbedApiKey,
}: {
  pickupLocation: string;
  googleMapsEmbedApiKey?: string;
}): string | null {
  const apiKey = googleMapsEmbedApiKey?.trim();
  const query = normalizeLocation(pickupLocation);
  if (!apiKey || !query) return null;

  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.search = new URLSearchParams({
    key: apiKey,
    q: query,
    zoom: "13",
    maptype: "roadmap",
  }).toString();
  return url.toString();
}

export function buildGoogleCarStreetViewEmbedUrl({
  latitude,
  longitude,
  googleMapsEmbedApiKey,
}: {
  latitude: number;
  longitude: number;
  googleMapsEmbedApiKey?: string;
}): string | null {
  const apiKey = googleMapsEmbedApiKey?.trim();
  if (
    !apiKey ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) return null;

  const url = new URL("https://www.google.com/maps/embed/v1/streetview");
  url.search = new URLSearchParams({
    key: apiKey,
    location: `${latitude},${longitude}`,
    pitch: "0",
    fov: "80",
    radius: "250",
    source: "outdoor",
  }).toString();
  return url.toString();
}

export function buildCarDirectionsUrl(pickupLocation: string): string | null {
  const destination = normalizeLocation(pickupLocation);
  if (!destination) return null;

  const url = new URL("https://www.google.com/maps/dir/");
  url.search = new URLSearchParams({
    api: "1",
    destination,
  }).toString();
  return url.toString();
}
