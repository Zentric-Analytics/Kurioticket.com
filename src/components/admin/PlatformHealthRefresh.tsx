"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function PlatformHealthRefresh() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return <button type="button" aria-busy={pending} disabled={pending} onClick={() => startTransition(() => router.refresh())} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">{pending ? "Refreshing…" : "Refresh observations"}</button>;
}
