import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isFeatureEnabled } from "@/lib/feature-controls/service";

export const metadata: Metadata = { title: "Packages", alternates: { canonical: "/packages" } };

export default async function DealsLayout({ children }: { children: ReactNode }) {
  if (await isFeatureEnabled("DEALS_ENABLED")) return children;
  return <main className="page-shell py-20"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-950">Packages are temporarily unavailable</h1><p className="mt-3 text-slate-600">Flight, hotel, and car search remain available independently.</p><Link className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-bold text-white" href="/">Explore travel</Link></div></main>;
}
