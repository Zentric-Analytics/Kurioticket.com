import { useLocalSearchParams } from "expo-router";
import { NativeFlightDetails } from "../src/features/search/NativeFlightDetails";

// Do not restore the retired snapshot route: <ApprovedDetailScreen product="flight" />.
// Flight Details must mount the authoritative ID-based native screen directly.
export default function FlightDetails() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <NativeFlightDetails params={params} />;
}
