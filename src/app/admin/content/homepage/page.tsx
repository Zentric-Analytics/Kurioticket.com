import Link from "next/link";

import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { HomepageCmsInitializeButton } from "@/components/admin/HomepageCmsInitializeButton";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { homepageCmsLocale } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Homepage Content" };

export default async function AdminHomepageContentPage() {
  const [destinations, flights, hotels] = await Promise.all([
    getCmsContentScopeSummary("HOMEPAGE_DESTINATION", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("FLIGHT_ROUTE", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("HOTEL_DESTINATION", "GLOBAL", homepageCmsLocale).catch(() => null),
  ]);

  const available = Boolean(destinations?.available && flights?.available && hotels?.available);
  const active = Boolean(destinations?.active && flights?.active && hotels?.active);

  return (
    <AdminPageShell
      title="Homepage content"
      description="Manage market destination cards, homepage flight-route cards and the canonical hotel destination catalog without changing fare operations."
      actions={
        <Link href="/admin/content" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
          Back to content
        </Link>
      }
    >
      <div className="space-y-5">
        {!available ? (
          <AdminEmptyState
            title="Homepage CMS unavailable"
            message="CMS storage could not be verified. The public homepage continues using the existing code-backed content."
          />
        ) : !active ? (
          <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">Initialize homepage CMS</h2>
                  <AdminStatusBadge tone="warn">Setup required</AdminStatusBadge>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Import the current homepage destinations, flight routes and canonical hotel destinations as the first published CMS versions. This is an explicit audited action.
                </p>
              </div>
              <HomepageCmsInitializeButton />
            </div>
          </AdminSectionCard>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <AdminMetricCard label="US destination cards" value={destinations?.total ?? 0} tone="good" />
              <AdminMetricCard label="US flight routes" value={flights?.total ?? 0} tone="good" />
              <AdminMetricCard label="Hotel destinations" value={hotels?.total ?? 0} tone="good" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ContentArea
                title="Homepage destinations"
                description="Market-scoped destination cards used by the popular destination/stay surface."
                href="/admin/content/homepage/destinations"
              />
              <ContentArea
                title="Flight route cards"
                description="Market-scoped discovery and regional route cards. Order controls which cards appear first."
                href="/admin/content/homepage/flight-routes"
              />
              <ContentArea
                title="Hotel destinations"
                description="Canonical GLOBAL hotel destination identities used for safe hotel discovery."
                href="/admin/content/homepage/hotel-destinations"
              />
            </div>
          </>
        )}
      </div>
    </AdminPageShell>
  );
}

function ContentArea({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <AdminSectionCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-black text-slate-950">{title}</h2>
        <AdminStatusBadge tone="good">CMS managed</AdminStatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-black text-indigo-700 hover:text-indigo-900">
        Manage
      </Link>
    </AdminSectionCard>
  );
}
