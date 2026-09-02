import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const keyForUser = (userId: string) => `kurioticket.profile-name.v1.${encodeURIComponent(userId)}`;
const memory = new Map<string, string | null>();
const revisions = new Map<string, number>();

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

function currentRevision(userId: string) {
  return revisions.get(userId) ?? 0;
}

export function peekProfileName(userId: string): string | null | undefined {
  return memory.get(userId);
}

export async function readProfileName(userId: string): Promise<string | null> {
  if (memory.has(userId)) return memory.get(userId) ?? null;
  const readRevision = currentRevision(userId);
  const key = keyForUser(userId);
  const value = Platform.OS === "web" ? webStorage()?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
  const normalized = value?.trim() || null;

  // A newer authoritative write may have completed while native storage was
  // resolving. Never let that older persisted value replace newer memory.
  if (currentRevision(userId) !== readRevision) return memory.get(userId) ?? null;

  if (!memory.has(userId)) memory.set(userId, normalized);
  return memory.get(userId) ?? null;
}

export async function writeProfileName(userId: string, name: string | null): Promise<void> {
  const normalized = name?.trim() || null;
  revisions.set(userId, currentRevision(userId) + 1);
  memory.set(userId, normalized);
  const key = keyForUser(userId);
  if (Platform.OS === "web") {
    if (normalized) webStorage()?.setItem(key, normalized);
    else webStorage()?.removeItem(key);
    return;
  }
  if (normalized) await SecureStore.setItemAsync(key, normalized, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(key);
}
