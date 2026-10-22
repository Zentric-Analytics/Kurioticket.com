"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Admin operations</p>
      <h1 className="mt-2 text-2xl font-black text-slate-950">This admin page could not be loaded</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        The operation failed before a verified admin result was available. No missing or unavailable data is being shown as a successful empty state.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800">
          Try again
        </button>
        <Link href="/admin" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
