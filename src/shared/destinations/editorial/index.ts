import { africaExploreDestinationEditorial } from "./africa";
import { asiaExploreDestinationEditorial } from "./asia";
import { centralAmericaExploreDestinationEditorial } from "./centralAmerica";
import { europeExploreDestinationEditorial } from "./europe";
import { legacyExploreDestinationEditorial } from "./legacy";
import { northAmericaExploreDestinationEditorial } from "./northAmerica";

/** Explicit aggregation preserves the historical editorial record order. */
export const rawExploreDestinationEditorial = [
  ...legacyExploreDestinationEditorial,
  ...europeExploreDestinationEditorial,
  ...africaExploreDestinationEditorial,
  ...asiaExploreDestinationEditorial,
  ...northAmericaExploreDestinationEditorial,
  ...centralAmericaExploreDestinationEditorial,
] as const;

export type {
  ExploreDestinationEditorial,
  ExploreDestinationEditorialProvenance,
  ExploreDestinationEditorialSourceReference,
} from "./types";
