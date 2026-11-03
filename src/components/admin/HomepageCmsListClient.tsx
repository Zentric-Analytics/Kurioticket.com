"use client";

import Link from "next/link";
import { ContentRecordsTable, ContentStatusPill, ContentEmptyState } from "@/components/admin/ContentWorkspace";
import { useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminInput,
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

export function HomepageCmsListClient({
  section,
  items,
  listQuery = "",
}: {
  section: HomepageCmsSection;
  items: CmsListItem[];
  listQuery?: string;
}) {
  const [query, setQuery] = useState(() => new URLSearchParams(listQuery).get("q") || "");

  function changeQuery(next: string) {
    setQuery(next);
    const url = new URL(window.location.href);
    if (next.trim()) url.searchParams.set("q", next.trim().slice(0, 160));
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }

  const editorContext = new URLSearchParams(listQuery);
  if (query.trim()) editorContext.set("q", query.trim().slice(0, 160));
  else editorContext.delete("q");

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
    <div className="space-y-3 [&_input]:h-9 [&_input]:rounded-lg [&_input]:text-[13px] [&_select]:h-9 [&_select]:rounded-lg [&_select]:text-[13px]">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
        <AdminInput
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search this page"
          aria-label="Search CMS content on this page"
        />
      </div>

      {filtered.length === 0 ? (
        <ContentEmptyState title="No matching content" message="No content on this page matches your search." />
      ) : (
        <ContentRecordsTable
          columns={["Content", "Market", "Status", "Order", "Version", "Updated", "Action"]}
          rows={filtered.map((item) => {
            const summary = readSummary(section, item.draftPayload);
            const unpublished = item.publishedVersion !== null && item.version !== item.publishedVersion;
            return {
              id: item.id,
              cells: [
                <div key="content" className="max-w-xl">
                  <p className="text-[13px] font-medium text-[#111827]">{summary.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{summary.detail || "—"}</p>
                </div>,
                item.market,
                <div key="status" className="space-y-1">
                  <ContentStatusPill status={item.status} />
                  {unpublished ? <p className="text-[12px] font-medium text-amber-700">Unpublished changes</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/homepage/${section}/${encodeURIComponent(item.id)}?${editorContext.toString()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">
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
