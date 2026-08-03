import { destinationById, type Destination } from "./destinationCatalogue";

/** Resolves only a single stable route ID; arrays and unknown IDs are invalid. */
export function resolveDestinationDetails(id: string | string[] | undefined): Destination | undefined {
  return typeof id === "string" ? destinationById.get(id) : undefined;
}
