import Link from "next/link";
import { Activity, MousePointerClick, Route, Search } from "lucide-react";

export const metadata = { title: "Admin Searches" };

const cards = [
  {
    href: "/admin/searches/activity",
    title: "Search Activity",
    description: "Review recorded searches, routes, outcomes, providers and identities.",
    icon: Search,
  },
  {
    href: "/admin/journeys",
    title: "Journeys",
    description: "Trace consented movement from search through provider handoff.",
    icon: Route,
  },
  {
    href: "/admin/redirects",
    title: "Provider Handoffs",
    description: "Review outbound provider clicks and their search correlation.",
    icon: MousePointerClick,
  },
  {
    href: "/admin/referral-attribution",
    title: "Referral Attribution",
    description: "Review verified provider referral attribution without inferring bookings.",
    icon: Activity,
  },
] as const;

export default function AdminSearchesWorkspacePage() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="grid grid-cols-2 gap-5">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group min-h-[176px] cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_10px_rgba(2,28,43,0.04)] transition-[border-color,box-shadow,transform] hover:border-violet-600 hover:shadow-[0_10px_24px_rgba(76,29,149,0.10)] focus-visible:border-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
          >
            <div className="flex h-full flex-col justify-between gap-8">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#021C2B] transition-colors group-hover:bg-violet-50 group-hover:text-violet-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[#021C2B]">{title}</h1>
                <p className="mt-2 max-w-[42ch] text-sm leading-6 text-[#64748B]">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
