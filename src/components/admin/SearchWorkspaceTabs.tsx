import Link from "next/link";
import { searchWorkspaceHref, searchWorkspaceTabs, type SearchWorkspaceTab } from "@/lib/adminSearchWorkspace";

export function SearchWorkspaceTabs({ active }: { active: SearchWorkspaceTab }) {
  return (
    <nav aria-label="Search activity sections" className="mx-auto mb-5 flex w-full max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#E5E7EB]">
      {searchWorkspaceTabs.map(tab => (
        <Link key={tab.id} href={searchWorkspaceHref(tab.id)} aria-current={active === tab.id ? "page" : undefined}
          className={"relative pb-3 text-[13px] font-semibold transition-colors " +
            (active === tab.id
              ? "text-[#004BB8] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#004BB8]"
              : "text-[#475569] hover:text-[#111827]")}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
