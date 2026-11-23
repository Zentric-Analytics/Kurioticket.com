import Link from "next/link";
import { isKayakSandboxEnabled, type KayakVertical } from "@/services/travel/kayakSandbox";

/** Server-only gate; never exposes provider credentials to the browser. */
export function KayakSandboxEntry({ vertical }: { vertical: KayakVertical }) {
  if (!isKayakSandboxEnabled()) return null;
  return <aside aria-label="KAYAK sandbox testing" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
    <Link className="font-semibold underline" href={`/sandbox/kayak?vertical=${vertical}`}>
      Test KAYAK {vertical} search
    </Link>{" "}— simulated inventory only; no real bookings.
  </aside>;
}
