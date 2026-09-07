import { useLocalSearchParams } from "expo-router";
import { NativeFlightDetails } from "../src/features/search/NativeFlightDetails";

export default function FlightDetails() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <NativeFlightDetails params={params} />;
}
