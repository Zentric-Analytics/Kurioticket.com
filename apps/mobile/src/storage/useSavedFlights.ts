import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { FlightResult } from "../api/travelApi";
import { favoriteAction } from "./favoriteAccess";
import { readSession } from "./sessionStorage";
import { showFavoriteSignInPrompt } from "./useSavedDestinations";

const SAVED_FLIGHTS_KEY = "kurioticket.saved.flights.v1";
const stores = new Map<string, SavedFlightsStore>();

const userKey = (userId: string) => `${SAVED_FLIGHTS_KEY}.${encodeURIComponent(userId)}`;

async function readSavedFlights(userId: string): Promise<FlightResult[]> {
  const key = userKey(userId);
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

async function writeSavedFlights(userId: string, flights: readonly FlightResult[]) {
  const key = userKey(userId);
  const value = JSON.stringify(flights);
  if (Platform.OS === "web") (globalThis as { localStorage?: Storage }).localStorage?.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

type Listener = (flights: Map<string, FlightResult>) => void;

class SavedFlightsStore {
  private flights = new Map<string, FlightResult>();
  private listeners = new Set<Listener>();
  private revision = 0;
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly userId: string) {}
  snapshot() { return new Map(this.flights); }
  subscribe(listener: Listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  async refresh() {
    const requestedAt = this.revision;
    await this.writes;
    const stored = await readSavedFlights(this.userId);
    if (requestedAt === this.revision) this.publish(new Map(stored.map((flight) => [flight.id, flight])), false);
  }

  toggle(flight: FlightResult) {
    const next = this.snapshot();
    next.has(flight.id) ? next.delete(flight.id) : next.set(flight.id, flight);
    this.publish(next, true);
    const intended = [...next.values()];
    const operation = this.writes.then(() => writeSavedFlights(this.userId, intended));
    this.writes = operation.catch(() => undefined);
    void operation.catch(() => this.refresh().catch(() => undefined));
    return operation;
  }

  private publish(flights: Map<string, FlightResult>, mutate: boolean) {
    this.flights = flights;
    if (mutate) this.revision += 1;
    this.listeners.forEach((listener) => listener(this.snapshot()));
  }
}

function storeFor(userId: string) {
  let store = stores.get(userId);
  if (!store) { store = new SavedFlightsStore(userId); stores.set(userId, store); }
  return store;
}

export function useSavedFlights() {
  const [userId, setUserId] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<{ userId: string | null; flights: Map<string, FlightResult> }>({ userId: null, flights: new Map() });
  const refresh = useCallback(() => {
    void readSession().then((session) => setUserId(session?.user.id ?? null)).catch(() => setUserId(null));
  }, []);
  useEffect(() => {
    if (!userId) { setSavedState({ userId: null, flights: new Map() }); return; }
    const store = storeFor(userId);
    setSavedState({ userId, flights: store.snapshot() });
    const unsubscribe = store.subscribe((flights) => setSavedState({ userId, flights }));
    void store.refresh().catch(() => undefined);
    return unsubscribe;
  }, [userId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const toggle = useCallback((flight: FlightResult) => {
    if (favoriteAction(userId) === "sign-in" || !userId) { showFavoriteSignInPrompt(); return; }
    void storeFor(userId).toggle(flight).catch(() => undefined);
  }, [userId]);
  return { savedFlights: savedState.userId === userId ? savedState.flights : new Map<string, FlightResult>(), toggle, refresh };
}
