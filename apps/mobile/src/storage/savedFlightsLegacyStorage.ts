import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { FlightResult } from "../api/travelApi";

export const SAVED_FLIGHTS_KEY = "kurioticket.saved.flights.v1";
export const savedFlightsUserKey = (userId: string) => `${SAVED_FLIGHTS_KEY}.${encodeURIComponent(userId)}`;

export async function readSavedFlights(userId: string): Promise<FlightResult[]> {
  const key = savedFlightsUserKey(userId);
  const raw = Platform.OS === "web"
    ? (globalThis as { localStorage?: Storage }).localStorage?.getItem(key)
    : await SecureStore.getItemAsync(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is FlightResult => !!item && typeof item === "object" && typeof (item as FlightResult).id === "string")
      : [];
  } catch {
    return [];
  }
}

export async function writeSavedFlights(userId: string, flights: readonly FlightResult[]) {
  const key = savedFlightsUserKey(userId);
  const value = JSON.stringify(flights);
  if (Platform.OS === "web") (globalThis as { localStorage?: Storage }).localStorage?.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
