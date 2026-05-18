import Link from "next/link";
import { legalDocuments } from "@/data/legalDocuments";

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy text-white">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="text-lg font-bold">Curioticket</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            Search flights and hotels for free, compare trusted partner prices, and make calmer travel decisions.
          </p>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Curioticket is a travel metasearch platform. External providers confirm current pricing, rules, availability, and purchase steps.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Platform</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/flights/results">Flights</Link>
            <Link href="/hotels/results">Hotels</Link>
            <Link href="/pricing">Premium</Link>
            <Link href="/support">Support</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Legal</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/legal">Legal Center</Link>
            {legalDocuments.slice(0, 5).map((document) => (
              <Link key={document.slug} href={`/legal/${document.slug}`}>
                {document.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
