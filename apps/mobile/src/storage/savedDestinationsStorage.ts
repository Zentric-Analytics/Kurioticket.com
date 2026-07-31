import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { parseSavedDestinationIds } from "./savedDestinationsModel";
import { resolveSavedDestinationIds } from "./savedDestinationsModel";

export const SAVED_DESTINATIONS_KEY = "kurioticket.explore.saved-destinations.v1";

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

export async function readSavedDestinationIds(): Promise<string[]> {
  const value = Platform.OS === "web"
    ? webStorage()?.getItem(SAVED_DESTINATIONS_KEY)
    : await SecureStore.getItemAsync(SAVED_DESTINATIONS_KEY);
  return resolveSavedDestinationIds(parseSavedDestinationIds(value));
}

let writeQueue: Promise<void> = Promise.resolve();
export function queueSavedDestinationIds(ids: readonly string[]): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(() => writeSavedDestinationIds(ids));
  return writeQueue;
}

export async function writeSavedDestinationIds(ids: readonly string[]): Promise<void> {
  const value = JSON.stringify(ids);
  if (Platform.OS === "web") webStorage()?.setItem(SAVED_DESTINATIONS_KEY, value);
  else await SecureStore.setItemAsync(SAVED_DESTINATIONS_KEY, value);
}
