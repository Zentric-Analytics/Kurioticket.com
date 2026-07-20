import { DealsResultsClient } from "@/components/results/DealsResultsClient";
import { parseDealsSearchParams } from "@/lib/deals/dealsSearchParams";
export default async function DealsResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <DealsResultsClient search={parseDealsSearchParams(await searchParams)} />
  );
}
