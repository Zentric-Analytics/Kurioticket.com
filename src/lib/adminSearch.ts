import type { Prisma } from "@/generated/prisma/client";

export function normalizeAdminSearch(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) || "";
}

export function adminSearchHistoryWhere(q: string): Prisma.SearchHistoryWhereInput {
  if (!q) return {};
  const OR: Prisma.SearchHistoryWhereInput[] = [
    { id: q },
    { origin: { contains: q, mode: "insensitive" } },
    { destination: { contains: q, mode: "insensitive" } },
    ...["provider", "label", "destinationName", "originAirport", "destinationAirport", "country", "market", "currency"].map((field) => ({
      query: { path: [field], string_contains: q, mode: "insensitive" as const },
    })),
  ];
  const type = q.toUpperCase().replace(/S$/, "");
  if (type === "FLIGHT" || type === "HOTEL" || type === "CAR" || type === "PACKAGE") OR.push({ type });
  const status = q.toUpperCase();
  if (status === "SUCCESS" || status === "FAILED" || status === "PARTIAL") OR.push({ status });
  return { OR };
}

export function matchesAdminProvider(provider: { product: string; providerName: string; environment: string }, q: string) {
  return [provider.product, provider.providerName, provider.environment].some((value) => value.toLowerCase().includes(q.toLowerCase()));
}
