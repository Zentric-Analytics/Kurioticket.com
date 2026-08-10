import { africaExploreDestinationEditorial } from "./africa";
import { asiaExploreDestinationEditorial } from "./asia";
import { europeExploreDestinationEditorial } from "./europe";
import { legacyExploreDestinationEditorial } from "./legacy";

/** Explicit aggregation preserves the historical editorial record order. */
export const rawExploreDestinationEditorial = [
  ...legacyExploreDestinationEditorial,
  ...europeExploreDestinationEditorial,
  ...africaExploreDestinationEditorial,
  ...asiaExploreDestinationEditorial,
] as const;

export type {
  ExploreDestinationEditorial,
  ExploreDestinationEditorialProvenance,
  ExploreDestinationEditorialSourceReference,
} from "./types";
