"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentRecordsTable, ContentStatusPill, ContentEmptyState } from "@/components/admin/ContentWorkspace";
import { useMemo, useState } from "react";

import {
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminPageShell";

type FaqListItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  draftPayload: unknown;
};

function faqPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { question: "Invalid FAQ draft", answer: "", category: "Uncategorized" };
  }
  const raw = value as Record<string, unknown>;
  return {
    question: typeof raw.question === "string" ? raw.question : "Invalid FAQ draft",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    category: typeof raw.category === "string" ? raw.category : "Uncategorized",
  };
}

export function FaqCmsListClient({ items, listQuery = "" }: { items: FaqListItem[]; listQuery?: string }) {
  const [query, setQuery] = useState(() => new URLSearchParams(listQuery).get("q") || "");
  const [category, setCategory] = useState(() => new URLSearchParams(listQuery).get("category") || "");

  function changeFilter(name: "q" | "category", next: string) {
    if (name === "q") setQuery(next);
    else setCategory(next);
    const url = new URL(window.location.href);
    if (next.trim()) url.searchParams.set(name, next.trim().slice(0, name === "q" ? 160 : 80));
    else url.searchParams.delete(name);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }

  const editorContext = new URLSearchParams(listQuery);
  if (query.trim()) editorContext.set("q", query.trim().slice(0, 160));
  else editorContext.delete("q");
  if (category) editorContext.set("category", category);
  else editorContext.delete("category");

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => faqPayload(item.draftPayload).category))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const payload = faqPayload(item.draftPayload);
      if (category && payload.category !== category) return false;
      if (!q) return true;
      return [payload.question, payload.answer, payload.category].some((value) =>
        value.toLowerCase().includes(q),
      );
    });
  }, [category, items, query]);

  return (
    <div className="space-y-3 [&_input]:h-9 [&_input]:rounded-lg [&_input]:text-[13px] [&_select]:h-9 [&_select]:rounded-lg [&_select]:text-[13px]">
      <div className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <AdminInput
          value={query}
          onChange={(event) => changeFilter("q", event.target.value)}
          placeholder="Search questions, answers or categories"
          aria-label="Search FAQs on this page"
        />
        <AdminSelect
          value={category}
          onChange={(event) => changeFilter("category", event.target.value)}
          aria-label="Filter FAQs by category"
        >
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </AdminSelect>
      </div>

      {filtered.length === 0 ? (
        <ContentEmptyState
          title="No FAQs match"
          message="No FAQ on this page matches the selected search and category filters."
        />
      ) : (
        <ContentRecordsTable
          columns={["Question", "Category", "Status", "Order", "Version", "Updated", "Action"]}
          rows={filtered.map((item) => {
            const payload = faqPayload(item.draftPayload);
            const hasUnpublishedChanges = item.publishedVersion !== null && item.version !== item.publishedVersion;
            return {
              id: item.id,
              cells: [
                <div key="question" className="max-w-xl">
                  <p className="text-[13px] font-medium text-[#111827]">{payload.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{payload.answer}</p>
                </div>,
                payload.category,
                <div key="status" className="space-y-1">
                  <ContentStatusPill status={item.status} />
                  {hasUnpublishedChanges ? <p className="text-[12px] font-medium text-amber-700">Unpublished changes</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/faqs/${encodeURIComponent(item.id)}?${editorContext.toString()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">
                  Edit <ArrowUpRight size={14} aria-hidden="true" />
                </Link>,
              ],
            };
          })}
        />
      )}
    </div>
  );
}
