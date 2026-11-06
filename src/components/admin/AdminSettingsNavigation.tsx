"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, LayoutGrid, RefreshCw } from "lucide-react";

const groups = [
  {
    label: "Feature controls",
    links: [
      { label: "Product availability", href: "/admin/settings", icon: LayoutGrid },
      { label: "Travel automation", href: "/admin/settings/travel-automation", icon: RefreshCw },
    ],
  },
  {
    label: "Preferences",
    links: [
      { label: "Notifications", href: "/admin/settings/notifications", icon: Bell },
    ],
  },
  {
    label: "Audit",
    links: [
      { label: "Recent changes", href: "/admin/settings/recent-changes", icon: History },
    ],
  },
] as const;

export function AdminSettingsNavigation() {
  const pathname = usePathname();

  return (
    <aside className="min-w-0 border-b border-[#D8E1EC] pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
      <h2 className="px-2 text-[15px] font-semibold text-[#020617]">Settings</h2>
      <nav aria-label="Settings sections" className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#64748B]">{group.label}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {group.links.map((item) => {
                const active = pathname === item.href || pathname === item.href + "/";
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex min-h-10 min-w-0 items-center gap-2.5 rounded-r-md border-l-2 px-3 py-2 text-[13px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 " +
                      (active
                        ? "border-[#004BB8] bg-[#F2F7FF] text-[#004BB8]"
                        : "border-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#020617]")
                    }
                  >
                    <Icon size={15} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
