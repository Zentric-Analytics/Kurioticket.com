import { travelApi } from "../../api/travelApi";
import type { MobileExploreCatalogue } from "../../api/exploreCatalogueContract";
import {
  readExploreCatalogueCache,
  writeExploreCatalogueCache,
} from "../../storage/exploreCatalogueCache";
import { bundledExploreCatalogue } from "./bundledExploreCatalogue";

export type ExploreCatalogueSource = "cache" | "bundled";

export type ExploreCatalogueSnapshot = {
  catalogue: MobileExploreCatalogue;
  source: ExploreCatalogueSource;
};

type ExploreCatalogueRepositoryDependencies = {
  readCache: () => Promise<MobileExploreCatalogue | null>;
  writeCache: (catalogue: MobileExploreCatalogue) => Promise<void>;
  fetchLive: () => Promise<MobileExploreCatalogue>;
  bundled: MobileExploreCatalogue;
};

const defaultDependencies: ExploreCatalogueRepositoryDependencies = {
  readCache: readExploreCatalogueCache,
  writeCache: writeExploreCatalogueCache,
  fetchLive: travelApi.exploreCatalogue,
  bundled: bundledExploreCatalogue,
};

export async function getExploreCatalogueSnapshot(
  dependencies: ExploreCatalogueRepositoryDependencies = defaultDependencies,
): Promise<ExploreCatalogueSnapshot> {
  const cached = await dependencies.readCache().catch(() => null);
  if (cached) return { catalogue: cached, source: "cache" };
  return { catalogue: dependencies.bundled, source: "bundled" };
}

export async function refreshExploreCatalogue(
  dependencies: ExploreCatalogueRepositoryDependencies = defaultDependencies,
): Promise<MobileExploreCatalogue> {
  const live = await dependencies.fetchLive();
  await dependencies.writeCache(live).catch(() => undefined);
  return live;
}

export async function loadExploreCatalogue(
  dependencies: ExploreCatalogueRepositoryDependencies = defaultDependencies,
) {
  const initial = await getExploreCatalogueSnapshot(dependencies);
  const refresh = refreshExploreCatalogue(dependencies).catch(() => null);
  return { initial, refresh };
}

export type { ExploreCatalogueRepositoryDependencies };
