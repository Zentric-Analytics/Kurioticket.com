import { getCurrencyRates } from "@/lib/currency/rateProvider";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getCurrencyRates();

  return Response.json(payload, {
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${payload.cacheTtlSeconds}, stale-while-revalidate=${payload.cacheTtlSeconds}`,
    },
  });
}
