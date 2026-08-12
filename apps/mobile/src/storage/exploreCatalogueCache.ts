import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  parseMobileExploreCatalogue,
  type MobileExploreCatalogue,
} from "../api/exploreCatalogueContract";

const MANIFEST_KEY = "kurioticket.explore.catalogue.v1.manifest";
const MAX_NATIVE_CHUNK_BYTES = 1500;
const MAX_CHUNK_COUNT = 512;
const MAX_READ_ATTEMPTS = 2;

type CacheManifest = {
  token: string;
  chunkCount: number;
};

type StringStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

const defaultStore: StringStore = {
  async getItem(key) {
    if (Platform.OS === "web") return webStorage()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === "web") {
      webStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === "web") {
      webStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

function safeTokenPart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "catalogue";
}

function chunkKey(token: string, index: number) {
  return `${MANIFEST_KEY}.${token}.${index}`;
}

function parseManifest(raw: string | null): CacheManifest | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CacheManifest>;
    if (typeof value.token !== "string" || !/^[A-Za-z0-9._-]+$/.test(value.token)) return null;
    if (!Number.isInteger(value.chunkCount) || !value.chunkCount || value.chunkCount < 1 || value.chunkCount > MAX_CHUNK_COUNT) return null;
    return { token: value.token, chunkCount: value.chunkCount };
  } catch {
    return null;
  }
}

function sameManifest(a: CacheManifest | null, b: CacheManifest | null) {
  return a?.token === b?.token && a?.chunkCount === b?.chunkCount;
}

function utf8Length(value: string) {
  return new TextEncoder().encode(value).length;
}

export function splitExploreCatalogueCacheValue(value: string, maxBytes = MAX_NATIVE_CHUNK_BYTES) {
  if (!Number.isInteger(maxBytes) || maxBytes < 4) throw new Error("Explore cache chunk size is invalid.");
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = utf8Length(char);
    if (current && currentBytes + charBytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }

  if (current || !chunks.length) chunks.push(current);
  return chunks;
}

async function removeManifestChunks(store: StringStore, manifest: CacheManifest | null) {
  if (!manifest) return;
  for (let index = 0; index < manifest.chunkCount; index += 1) {
    await store.removeItem(chunkKey(manifest.token, index)).catch(() => undefined);
  }
}

async function readManifest(store: StringStore) {
  return parseManifest(await store.getItem(MANIFEST_KEY).catch(() => null));
}

async function readGeneration(store: StringStore, manifest: CacheManifest) {
  const chunks: string[] = [];
  for (let index = 0; index < manifest.chunkCount; index += 1) {
    const chunk = await store.getItem(chunkKey(manifest.token, index)).catch(() => null);
    if (chunk === null) return null;
    chunks.push(chunk);
  }

  try {
    return parseMobileExploreCatalogue(JSON.parse(chunks.join("")));
  } catch {
    return null;
  }
}

export async function readExploreCatalogueCache(store: StringStore = defaultStore): Promise<MobileExploreCatalogue | null> {
  for (let attempt = 0; attempt < MAX_READ_ATTEMPTS; attempt += 1) {
    const manifest = await readManifest(store);
    if (!manifest) return null;

    const catalogue = await readGeneration(store, manifest);
    const latestManifest = await readManifest(store);
    if (sameManifest(manifest, latestManifest)) return catalogue;
  }

  return null;
}

export async function writeExploreCatalogueCache(
  catalogue: MobileExploreCatalogue,
  store: StringStore = defaultStore,
): Promise<void> {
  const validated = parseMobileExploreCatalogue(catalogue);
  if (!validated) throw new Error("Refusing to cache an invalid Explore catalogue.");

  const previousManifest = await readManifest(store);
  const serialized = JSON.stringify(validated);
  const chunks = Platform.OS === "web" ? [serialized] : splitExploreCatalogueCacheValue(serialized);
  if (chunks.length > MAX_CHUNK_COUNT) throw new Error("Explore catalogue cache exceeds the supported size.");

  const manifest: CacheManifest = {
    token: `${safeTokenPart(validated.version)}-${Date.now().toString(36)}`,
    chunkCount: chunks.length,
  };

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await store.setItem(chunkKey(manifest.token, index), chunks[index]!);
    }
    await store.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  } catch (error) {
    await removeManifestChunks(store, manifest);
    throw error;
  }

  await removeManifestChunks(store, previousManifest);
}

export async function clearExploreCatalogueCache(store: StringStore = defaultStore): Promise<void> {
  const manifest = await readManifest(store);
  await store.removeItem(MANIFEST_KEY).catch(() => undefined);
  await removeManifestChunks(store, manifest);
}

export type { StringStore as ExploreCatalogueCacheStore };
