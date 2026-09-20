import { useEffect, useMemo, useRef } from "react";
import MapView, { type Region } from "react-native-maps";
import {
  airports,
  normalizeAirportSearchText,
  searchAirports,
  type AirportOption,
} from "../../../../../src/shared/airports";

type ExploreMapProps = {
  place?: string;
  airportCode?: string;
  coordinates?: { latitude: number; longitude: number };
};

const WORLD_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 180,
};

const coordinates = (airport: AirportOption) => {
  const latitude = airport.latitude ?? airport.lat;
  const longitude = airport.longitude ?? airport.lon;
  return typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
};

function longitudeBounds(values: number[]) {
  const normalMin = Math.min(...values);
  const normalMax = Math.max(...values);
  if (normalMax - normalMin <= 180) {
    return { min: normalMin, max: normalMax, shifted: false };
  }
  const shifted = values.map((value) => (value < 0 ? value + 360 : value));
  return { min: Math.min(...shifted), max: Math.max(...shifted), shifted: true };
}

function regionForAirports(matches: readonly AirportOption[]): Region {
  const points = matches.map(coordinates).filter((value): value is NonNullable<ReturnType<typeof coordinates>> => value !== null);
  if (!points.length) return WORLD_REGION;
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.9,
      longitudeDelta: 0.9,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitude = longitudeBounds(longitudes);
  let centerLongitude = (longitude.min + longitude.max) / 2;
  if (longitude.shifted && centerLongitude > 180) centerLongitude -= 360;

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: centerLongitude,
    latitudeDelta: Math.min(120, Math.max(0.9, (maxLatitude - minLatitude) * 1.5)),
    longitudeDelta: Math.min(180, Math.max(0.9, (longitude.max - longitude.min) * 1.5)),
  };
}

function matchingAirports(place: string, airportCode?: string) {
  const normalizedCode = airportCode?.trim().toUpperCase();
  if (normalizedCode) {
    const exactAirport = airports.find((airport) => airport.code.toUpperCase() === normalizedCode);
    if (exactAirport) return [exactAirport];
  }

  const trimmedPlace = place.trim();
  if (!trimmedPlace) return [];

  const queries = [
    trimmedPlace,
    trimmedPlace.split(",")[0]?.trim() ?? "",
  ].filter(Boolean);

  for (const query of queries) {
    const matches = searchAirports(query, 24);
    if (matches.length) return matches;
  }

  const normalized = normalizeAirportSearchText(trimmedPlace);
  return airports.filter((airport) =>
    [airport.city, airport.country ?? "", airport.countryCode ?? ""]
      .map(normalizeAirportSearchText)
      .some((value) => value === normalized),
  );
}

export function ExploreMap({ place = "", airportCode, coordinates: destinationCoordinates }: ExploreMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const region = useMemo(() => {
    if (
      destinationCoordinates &&
      Number.isFinite(destinationCoordinates.latitude) &&
      destinationCoordinates.latitude >= -90 &&
      destinationCoordinates.latitude <= 90 &&
      Number.isFinite(destinationCoordinates.longitude) &&
      destinationCoordinates.longitude >= -180 &&
      destinationCoordinates.longitude <= 180
    ) {
      return {
        latitude: destinationCoordinates.latitude,
        longitude: destinationCoordinates.longitude,
        latitudeDelta: 0.9,
        longitudeDelta: 0.9,
      };
    }
    return regionForAirports(matchingAirports(place, airportCode));
  }, [airportCode, destinationCoordinates, place]);

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 300);
  }, [region]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={region}
      mapType="standard"
      showsUserLocation={false}
      scrollEnabled
      zoomEnabled
      rotateEnabled
      pitchEnabled
      accessibilityLabel={place ? `Apple Map of ${place}` : "Explore world map"}
    />
  );
}
