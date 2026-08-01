import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "./savedDestinationsModel";

export const SAVED_DESTINATIONS_KEY = "kurioticket.explore.saved-destinations.v2";
export const LEGACY_SAVED_DESTINATIONS_KEY = "kurioticket.explore.saved-destinations.v1";

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

async function readRaw(key: string): Promise<string | null | undefined> {
  return Platform.OS === "web"
    ? webStorage()?.getItem(key)
    : await SecureStore.getItemAsync(key);
}

async function removeRaw(key: string): Promise<void> {
  if (Platform.OS === "web") webStorage()?.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export async function readSavedDestinationIds(): Promise<string[]> {
  const current = await readRaw(SAVED_DESTINATIONS_KEY);
  if (current) return resolveSavedDestinationIds(parseSavedDestinationIds(current));

  const legacy = await readRaw(LEGACY_SAVED_DESTINATIONS_KEY);
  const migrated = resolveSavedDestinationIds(parseSavedDestinationIds(legacy));
  if (legacy) {
    await writeSavedDestinationIds(migrated);
    await removeRaw(LEGACY_SAVED_DESTINATIONS_KEY);
  }
  return migrated;
}

let writeQueue: Promise<void> = Promise.resolve();
export function queueSavedDestinationIds(ids: readonly string[]): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(() => writeSavedDestinationIds(ids));
  return writeQueue;
}

export async function writeSavedDestinationIds(ids: readonly string[]): Promise<void> {
  const value = JSON.stringify(resolveSavedDestinationIds(ids));
  if (Platform.OS === "web") webStorage()?.setItem(SAVED_DESTINATIONS_KEY, value);
  else await SecureStore.setItemAsync(SAVED_DESTINATIONS_KEY, value);
}
