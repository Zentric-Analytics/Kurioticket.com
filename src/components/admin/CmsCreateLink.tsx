"use client";

import { useSearchParams } from "next/navigation";
import { AdminLinkButton } from "@/components/admin/AdminPageShell";

/** Preserve the current list filters when opening a new CMS draft. */
export function CmsCreateLink({ path, label }: { path: string; label: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return (
    <AdminLinkButton href={path + (query ? "?" + query : "")} variant="primary" size="sm" className="h-9 rounded-lg bg-[#3154EF] text-[13px] font-semibold shadow-none hover:bg-[#2445D7]">
      {label}
    </AdminLinkButton>
  );
}
