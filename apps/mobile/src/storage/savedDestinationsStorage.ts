import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "./savedDestinationsModel";

export const SAVED_DESTINATIONS_KEY = "kurioticket.explore.saved-destinations.v3";

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

async function readRaw(key: string): Promise<string | null | undefined> {
  return Platform.OS === "web"
    ? webStorage()?.getItem(key)
    : await SecureStore.getItemAsync(key);
}

const userKey = (userId: string) => `${SAVED_DESTINATIONS_KEY}.${encodeURIComponent(userId)}`;

export async function readSavedDestinationIds(userId: string): Promise<string[]> {
  const current = await readRaw(userKey(userId));
  if (current) return resolveSavedDestinationIds(parseSavedDestinationIds(current));
  // v1/v2 values may belong to a guest or another account. Do not attach them
  // to the current user; new writes are safely scoped by the stable session ID.
  return [];
}

let writeQueue: Promise<void> = Promise.resolve();
export function queueSavedDestinationIds(userId: string, ids: readonly string[]): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(() => writeSavedDestinationIds(userId, ids));
  return writeQueue;
}

export async function writeSavedDestinationIds(userId: string, ids: readonly string[]): Promise<void> {
  const value = JSON.stringify(resolveSavedDestinationIds(ids));
  if (Platform.OS === "web") webStorage()?.setItem(userKey(userId), value);
  else await SecureStore.setItemAsync(userKey(userId), value);
}
