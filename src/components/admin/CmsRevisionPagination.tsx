"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CmsRevisionPagination({ query, before, next }: { query: string; before?: string; next: string | null }) {
  const path = usePathname();
  const params = new URLSearchParams(query);
  const latestHref = path + (params.size ? "?" + params.toString() : "");
  if (next) params.set("revisionBefore", next);
  return before || next ? <nav aria-label="Revision history pages" className="mt-4 flex flex-wrap justify-between gap-3 text-[13px] font-medium text-[#004BB8]">
    {before ? <Link href={latestHref} scroll={false} className="underline">Latest revisions</Link> : <span />}
    {next ? <Link href={path + "?" + params.toString()} scroll={false} className="underline">Older revisions</Link> : null}
  </nav> : null;
}
