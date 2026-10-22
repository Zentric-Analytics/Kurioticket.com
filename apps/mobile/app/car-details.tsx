import { useLocalSearchParams } from "expo-router";
import { ApprovedCarDetailScreen } from "../src/features/search/ApprovedCarDetailScreen";
import { NativeKayakCarDetailScreen } from "../src/features/search/NativeKayakCarDetailScreen";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function isKayakCarResult(raw?: string, resultId?: string) {
  if (resultId?.startsWith("kayak-sandbox:")) return true;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { inventorySource?: string; searchPolicy?: { source?: string } };
    return parsed.inventorySource === "kayak-sandbox" || parsed.searchPolicy?.source === "kayak-sandbox";
  } catch {
    return false;
  }
}

export default function CarDetails() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return isKayakCarResult(one(params.result), one(params.resultId))
    ? <NativeKayakCarDetailScreen />
    : <ApprovedCarDetailScreen />;
}
