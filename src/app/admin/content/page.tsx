import Link from "next/link";

import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { generalFaqs } from "@/content/faqs";
import { getDefaultHomeDiscoveryPriceRoutes } from "@/data/homeDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";

export const metadata = { title: "Admin Content" };

const homepageDestinationCount = Object.values(popularDestinationsByMarket).reduce((count, items) => count + items.length, 0);
const flightRouteCount = getDefaultHomeDiscoveryPriceRoutes().length;

export default async function AdminContentPage() {
  const faqSummary = await getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale)
    .catch(() => ({
      available: false,
      active: false,
      total: 0,
      draft: 0,
      published: 0,
      hidden: 0,
      archived: 0,
    }));

  const contentAreas = [
    {
      title: "Homepage destination cards",
      status: "Read-only",
      value: homepageDestinationCount,
      note: "Existing market homepage content is available for review. CMS editing arrives in the homepage-content phase.",
    },
    {
      title: "Flight route cards",
      status: "Read-only",
      value: flightRouteCount,
      note: "Existing homepage flight route definitions remain configuration-backed until the homepage-content CMS phase.",
    },
    {
      title: "Hotel destination cards",
      status: "Read-only",
      value: hotelDestinations.length,
      note: "Existing hotel destination definitions remain read-only until canonical destination editing is connected safely.",
    },
    {
      title: "FAQs",
      status: !faqSummary.available ? "Unavailable" : faqSummary.active ? "CMS managed" : "Setup required",
      value: faqSummary.active ? faqSummary.total : generalFaqs.length,
      note: !faqSummary.available
        ? "CMS storage could not be verified. Public FAQs continue using the existing translated code-backed content."
        : faqSummary.active
          ? faqSummary.published + " published · " + faqSummary.draft + " draft · " + faqSummary.hidden + " hidden · " + faqSummary.archived + " archived"
          : "Initialize the current English FAQ set, then create drafts, preview, publish, hide and archive from admin.",
      href: "/admin/content/faqs",
    },
  ];

  return (
    <AdminPageShell
      title="Public Content Management"
      description="Manage CMS-backed public content while configuration-backed areas remain read-only until their migration phases."
      actions={<Link href="/admin/settings" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Homepage fare operations</Link>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contentAreas.map((area) => (
          <AdminSectionCard key={area.title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-black text-slate-950">{area.title}</h2>
              <AdminStatusBadge tone={area.status === "CMS managed" ? "good" : area.status === "Setup required" ? "warn" : area.status === "Unavailable" ? "bad" : "info"}>
                {area.status}
              </AdminStatusBadge>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950">{area.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{area.note}</p>
            {"href" in area && area.href ? (
              <Link href={area.href} className="mt-4 inline-flex text-sm font-black text-indigo-700 hover:text-indigo-900">
                Manage FAQs
              </Link>
            ) : null}
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageShell>
  );
}
