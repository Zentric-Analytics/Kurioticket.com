import { notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { KayakSandboxSearch } from "./search";

export const metadata = {
  title: "KAYAK sandbox",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function KayakSandboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isKayakSandboxEnabled()) notFound();
  const requested = (await searchParams).vertical;
  const vertical = requested === "hotels" || requested === "cars" ? requested : "flights";
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold">KURIOTICKET · INTEGRATION PREVIEW</p>
      <h1 className="mt-3 text-3xl font-bold">KAYAK sandbox search</h1>
      <p className="my-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        Test data only. Prices and availability are simulated. Links open
        KAYAK’s test page, not a real booking. Existing live search providers
        are unchanged.
      </p>
      <KayakSandboxSearch key={vertical} initialVertical={vertical} />
    </main>
  );
}
