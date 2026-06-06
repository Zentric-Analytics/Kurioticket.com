import { fetchCurrencyFreaksRates, getCacheTtlSeconds } from "@/lib/currency/rateProvider";
import { storeCurrencyRateSnapshot } from "@/lib/currency/currencyRateSnapshotStore";
import { clearCachedCurrencyRates } from "@/lib/currency/rateCache";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.FX_RATES_CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization")?.trim();
  const cronSecret = request.headers.get("x-cron-secret")?.trim();

  return authorization === `Bearer ${secret}` || cronSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheTtlSeconds = getCacheTtlSeconds();

  try {
    const payload = await fetchCurrencyFreaksRates({ cacheTtlSeconds });
    const canStore = payload.missingCurrencies.length === 0;
    const snapshot = canStore
      ? await storeCurrencyRateSnapshot({ payload, status: "valid" })
      : null;

    if (snapshot) clearCachedCurrencyRates();

    return Response.json({
      source: payload.source,
      base: payload.base,
      fetchedAt: payload.fetchedAt,
      expiresAt: payload.cacheExpiresAt,
      missingCurrencies: payload.missingCurrencies,
      rateCount: payload.rateCount,
      stored: Boolean(snapshot),
      snapshotId: snapshot?.id,
    });
  } catch {
    return Response.json(
      {
        source: "CurrencyFreaks",
        base: "USD",
        stored: false,
        error: "Currency rate sync failed; last known good snapshot was preserved.",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
