"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Retry the same authorized Activity request, preserving visitor, filters
 * and navigation context. No extra client-side identity or database reads.
 */
export function ActivityRetryButton() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      onClick={() => startTransition(() => router.refresh())}
      className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw size={15} aria-hidden="true" className={isRefreshing ? "animate-spin" : ""} />
      {isRefreshing ? "Refreshing activity…" : "Retry Activity"}
    </button>
  );
}
