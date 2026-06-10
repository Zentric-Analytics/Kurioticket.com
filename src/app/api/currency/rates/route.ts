import { getCurrencyRates } from "@/lib/currency/rateProvider";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const payload = await getCurrencyRates();

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  });
}
