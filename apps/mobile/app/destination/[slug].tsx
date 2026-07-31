import { useLocalSearchParams } from "expo-router";
import { DestinationDetailScreen, DestinationNotFound } from "../../src/features/destination/DestinationDetailScreen";
import { getDestination } from "../../src/features/destination/destinationData";

export default function DestinationRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const destination = getDestination(Array.isArray(slug) ? slug[0] : slug);
  return destination ? <DestinationDetailScreen destination={destination} /> : <DestinationNotFound />;
}
