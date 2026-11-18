"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function PlatformHealthRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button type="button" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#D8E1EC] bg-white px-4 text-[13px] font-medium text-[#004BB8] transition-colors hover:bg-[#F4F7FB] disabled:opacity-60">
      <RefreshCw size={14} aria-hidden="true" />
      {pending ? "Refreshing…" : "Refresh observations"}
    </button>
  );
}
