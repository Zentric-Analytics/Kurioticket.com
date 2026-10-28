import type { ReactNode } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

/** Retain the existing standalone legacy layouts; embedded sections share
 * the Search Activity shell without nesting another admin page container.
 */
export function SearchWorkspacePanelFrame({
  embedded, title, description, hideHeader, children,
}: { embedded: boolean; title: string; description?: string; hideHeader?: boolean; children: ReactNode }) {
  if (embedded) {
    return (
      <section aria-label={title} className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <h1 className="sr-only">{title}</h1>
        {description ? <p className="border-b border-[#E5E7EB] px-2 py-3 text-[12px] leading-5 text-[#6B7280]">{description}</p> : null}
        {children}
      </section>
    );
  }
  return <AdminPageShell title={title} description={description} hideHeader={hideHeader}>{children}</AdminPageShell>;
}
