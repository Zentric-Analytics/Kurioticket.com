"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CmsRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}
    className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50">
    {pending ? "Retrying…" : "Retry"}
  </button>;
}
