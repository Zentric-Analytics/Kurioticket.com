import { AdminLinkButton, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";

import { getContentInventory } from "./inventory";

export const metadata = { title: "Admin Content Inventory" };

export default function AdminContentPage() {
  const contentAreas = getContentInventory();

  return (
    <AdminPageShell
      title="Content Inventory"
      description="Review selected code-backed public content sources used across Kurioticket."
    >
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contentAreas.map((area) => (
          <AdminSectionCard key={area.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{area.title}</h2>
              <AdminStatusBadge tone={area.publicState === "Public" ? "info" : "neutral"}>
                {area.publicState} · {area.sourceType}
              </AdminStatusBadge>
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-950">
              {area.primaryCount} <span className="text-sm font-semibold text-slate-600">{area.unit}</span>
            </p>
            {area.supportingMetrics.length ? (
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                {area.supportingMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-baseline justify-between gap-3">
                    <dt>{metric.label}</dt>
                    <dd className="font-semibold text-slate-950">{metric.value} {metric.unit}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{area.note}</p>
            <AdminLinkButton className="mt-4" href={area.href} size="sm">
              View inventory
            </AdminLinkButton>
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageShell>
  );
}
