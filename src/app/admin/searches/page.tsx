import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";

export const metadata = { title: "Admin Searches" };

const workspaceLinks = [
  { href: "/admin/searches/activity", title: "Search activity", description: "Recorded searches and outcomes" },
  { href: "/admin/journeys", title: "Journeys", description: "Search-to-handoff customer journeys" },
  { href: "/admin/redirects", title: "Provider handoffs", description: "Outbound provider click activity" },
  { href: "/admin/referral-attribution", title: "Referral attribution", description: "Verified provider referral performance" },
];

export default function AdminSearchesPage() {
  return (
    <AdminPageShell title="Searches" hideHeader>
      <div className="mx-auto w-full max-w-[1400px]">
        <nav aria-label="Search workspace" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {workspaceLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex min-h-[92px] cursor-pointer items-center border border-[#D8E1EC] bg-white px-5 py-4 text-left transition-colors duration-150 hover:border-violet-600 focus-visible:border-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
            >
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold leading-5 text-[#1A1A1A]">
                  {item.title}
                </span>
                <span className="mt-1.5 block text-[13px] font-normal leading-5 text-[#595959]">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </AdminPageShell>
  );
}
