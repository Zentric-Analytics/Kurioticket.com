"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

/** Keep the current Content directory filters when opening the draft editor. */
export function CmsCreateLink({ path, label }: { path: string; label: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <Link
      href={path + (query ? "?" + query : "")}
      className="focus-ring inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#111827] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#374151] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]"
    >
      <Plus size={15} strokeWidth={2} aria-hidden="true" />
      {label}
    </Link>
  );
}
