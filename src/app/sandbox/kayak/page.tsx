import { notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { KayakSandboxSearch } from "./search";

export const metadata = {
  title: "KAYAK sandbox",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function KayakSandboxPage() {
  if (!isKayakSandboxEnabled()) notFound();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold">KURIOTICKET · INTEGRATION PREVIEW</p>
      <h1 className="mt-3 text-3xl font-bold">KAYAK sandbox search</h1>
      <p className="my-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        Test data only. Prices and availability are simulated. Links open
        KAYAK’s test page, not a real booking. Existing live search providers
        are unchanged.
      </p>
      <KayakSandboxSearch />
    </main>
  );
}
