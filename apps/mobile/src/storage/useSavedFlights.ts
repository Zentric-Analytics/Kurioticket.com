import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "kurioticket.search.saved-flights.v1";
let ids = new Set<string>();
let loaded = false;
const listeners = new Set<(value: Set<string>) => void>();
const notify = () => listeners.forEach((listener) => listener(new Set(ids)));
const storage = () => (globalThis as { localStorage?: Storage }).localStorage;
async function load() {
  if (loaded) return;
  const raw = Platform.OS === "web" ? storage()?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  try { ids = new Set((JSON.parse(raw || "[]") as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 200)); } catch { ids = new Set(); }
  loaded = true; notify();
}
async function persist() {
  const raw = JSON.stringify([...ids].slice(-200));
  if (Platform.OS === "web") storage()?.setItem(KEY, raw); else await SecureStore.setItemAsync(KEY, raw);
}
export function useSavedFlights() {
  const [savedIds, setSavedIds] = useState(new Set(ids));
  useEffect(() => { listeners.add(setSavedIds); void load(); return () => { listeners.delete(setSavedIds); }; }, []);
  const toggle = useCallback((id: string) => { ids.has(id) ? ids.delete(id) : ids.add(id); notify(); void persist(); }, []);
  return { savedIds, toggle };
}
