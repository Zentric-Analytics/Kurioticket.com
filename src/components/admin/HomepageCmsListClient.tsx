"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminInput,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import type { HomepageCmsSection } from "@/lib/adminHomepageCms";

type CmsListItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  draftPayload: unknown;
};

function readSummary(section: HomepageCmsSection, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: "Invalid content", detail: "" };
  }
  const raw = value as Record<string, unknown>;

  if (section === "destinations") {
    const city = typeof raw.city === "string" ? raw.city : "Invalid destination";
    const country = typeof raw.country === "string" ? raw.country : "";
    const origin = typeof raw.originCode === "string" ? raw.originCode : "";
    const destination = typeof raw.destinationCode === "string" ? raw.destinationCode : "";
    return { title: city, detail: [country, origin && destination ? `${origin} → ${destination}` : ""].filter(Boolean).join(" · ") };
  }

  if (section === "flight-routes") {
    const title = typeof raw.title === "string" ? raw.title : "Invalid route";
    const origin = typeof raw.originCode === "string" ? raw.originCode : "";
    const destination = typeof raw.destinationCode === "string" ? raw.destinationCode : "";
    return { title, detail: origin && destination ? `${origin} → ${destination}` : "" };
  }

  const name = typeof raw.name === "string" ? raw.name : "Invalid hotel destination";
  const country = typeof raw.country === "string" ? raw.country : "";
  const canonicalId = typeof raw.canonicalId === "string" ? raw.canonicalId : "";
  return { title: name, detail: [country, canonicalId].filter(Boolean).join(" · ") };
}

function tone(status: CmsListItem["status"]) {
  if (status === "PUBLISHED") return "good" as const;
  if (status === "HIDDEN") return "warn" as const;
  if (status === "ARCHIVED") return "neutral" as const;
  return "info" as const;
}

export function HomepageCmsListClient({
  section,
  items,
}: {
  section: HomepageCmsSection;
  items: CmsListItem[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const summary = readSummary(section, item.draftPayload);
      return [summary.title, summary.detail, item.market, item.status]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [items, query, section]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <AdminInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this page"
          aria-label="Search CMS content on this page"
        />
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState title="No matching content" message="No content on this page matches your search." />
      ) : (
        <AdminDataTable
          columns={["Content", "Market", "Status", "Order", "Version", "Updated", "Action"]}
          rows={filtered.map((item) => {
            const summary = readSummary(section, item.draftPayload);
            const unpublished = item.publishedVersion !== null && item.version !== item.publishedVersion;
            return {
              id: item.id,
              cells: [
                <div key="content" className="max-w-xl">
                  <p className="font-black text-slate-950">{summary.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{summary.detail || "—"}</p>
                </div>,
                item.market,
                <div key="status" className="space-y-1">
                  <AdminStatusBadge tone={tone(item.status)}>{item.status}</AdminStatusBadge>
                  {unpublished ? <p className="text-xs font-bold text-amber-700">Unpublished changes</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/homepage/${section}/${item.id}`} className="font-black text-indigo-700 hover:text-indigo-900">
                  Edit
                </Link>,
              ],
            };
          })}
        />
      )}
    </div>
  );
}
