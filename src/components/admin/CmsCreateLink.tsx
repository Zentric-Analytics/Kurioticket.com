"use client";

import { useSearchParams } from "next/navigation";
import { AdminLinkButton } from "@/components/admin/AdminPageShell";

/** Preserve the current list filters when opening a new CMS draft. */
export function CmsCreateLink({ path, label }: { path: string; label: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return (
    <AdminLinkButton href={path + (query ? "?" + query : "")} variant="primary">
      {label}
    </AdminLinkButton>
  );
}
