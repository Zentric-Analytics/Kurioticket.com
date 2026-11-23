"use client";
import { useResultsReturnIntent } from "@/components/results/useResultsReturnIntent";

/**
 * The car details page is server rendered. When inventory has expired,
 * CarDetailsClient never mounts, but Back still must restore the old
 * results without submitting a second search.
 */
export function CarUnavailableResultsReturnIntent({ resultsHref }: { resultsHref: string }) {
  useResultsReturnIntent("car", resultsHref);
  return null;
}
