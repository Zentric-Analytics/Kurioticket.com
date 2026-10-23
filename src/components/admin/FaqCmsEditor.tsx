"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  AdminButton,
  AdminInput,
  AdminSectionCard,
  AdminStatusBadge,
  AdminTextarea,
} from "@/components/admin/AdminPageShell";

type FaqCmsItem = {
  id: string;
  key: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  locale: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  draftPayload: unknown;
};

function readPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { question: "", answer: "", category: "General" };
  }
  const raw = value as Record<string, unknown>;
  return {
    question: typeof raw.question === "string" ? raw.question : "",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    category: typeof raw.category === "string" ? raw.category : "General",
  };
}

function statusTone(status: FaqCmsItem["status"]) {
  if (status === "PUBLISHED") return "good" as const;
  if (status === "HIDDEN") return "warn" as const;
  if (status === "ARCHIVED") return "neutral" as const;
  return "info" as const;
}

export function FaqCmsEditor({ initialItem }: { initialItem?: FaqCmsItem }) {
  const router = useRouter();
  const initialPayload = useMemo(() => readPayload(initialItem?.draftPayload), [initialItem]);
  const [item, setItem] = useState<FaqCmsItem | undefined>(initialItem);
  const [question, setQuestion] = useState(initialPayload.question);
  const [answer, setAnswer] = useState(initialPayload.answer);
  const [category, setCategory] = useState(initialPayload.category);
  const [sortOrder, setSortOrder] = useState(String(initialItem?.sortOrder ?? 0));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  const validDraft =
    question.trim().length > 0 &&
    answer.trim().length > 0 &&
    category.trim().length > 0 &&
    Number.isInteger(Number(sortOrder)) &&
    Number(sortOrder) >= 0;

  const savedPayload = readPayload(item?.draftPayload);
  const draftDirty = Boolean(
    item &&
    (
      question.trim() !== savedPayload.question ||
      answer.trim() !== savedPayload.answer ||
      category.trim() !== savedPayload.category ||
      Number(sortOrder) !== item.sortOrder
    )
  );
  const hasUnpublishedChanges =
    item?.publishedVersion !== null &&
    item?.publishedVersion !== undefined &&
    item.version !== item.publishedVersion;

  function payload() {
    return {
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
    };
  }

  function createDraft() {
    if (!validDraft) return;
    setMessage(null);
    setError(null);
    setConflict(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FAQ",
          key: `faq-${crypto.randomUUID()}`,
          market: "GLOBAL",
          locale: "en",
          sortOrder: Number(sortOrder),
          payload: payload(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item?.id) {
        setError(typeof body.error === "string" ? body.error : "Unable to create FAQ draft.");
        return;
      }
      router.replace(`/admin/content/faqs/${body.item.id}`);
      router.refresh();
    });
  }

  function saveDraft() {
    if (!item || !validDraft) return;
    mutate("save_draft", {
      payload: payload(),
      sortOrder: Number(sortOrder),
    }, "Draft saved.");
  }

  function publish() {
    if (!item || !validDraft || draftDirty) return;
    mutate("publish", {}, "FAQ published.");
  }

  function hide() {
    if (!item) return;
    mutate("hide", {}, "FAQ hidden from the public FAQ scope.");
  }

  function archive() {
    if (!item || !window.confirm("Archive this FAQ? Archived content cannot be edited in this CMS phase.")) return;
    mutate("archive", {}, "FAQ archived.");
  }

  function mutate(action: "save_draft" | "publish" | "hide" | "archive", extra: Record<string, unknown>, success: string) {
    if (!item) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedVersion: item.version,
          ...extra,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item) {
        if (response.status === 409) {
          setConflict(true);
          setError("This FAQ changed in another admin session. Reload the latest version before making more edits.");
        } else {
          setError(typeof body.error === "string" ? body.error : "Unable to update FAQ.");
        }
        return;
      }
      setConflict(false);
      setItem(body.item as FaqCmsItem);
      setSortOrder(String(body.item.sortOrder ?? Number(sortOrder)));
      setMessage(success);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <AdminSectionCard className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">{item ? "Edit FAQ" : "Create FAQ draft"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                English FAQ content for the GLOBAL public FAQ scope.
              </p>
            </div>
            {item ? <AdminStatusBadge tone={statusTone(item.status)}>{item.status}</AdminStatusBadge> : null}
          </div>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Question</span>
            <AdminInput
              className="mt-2"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={240}
              disabled={pending || item?.status === "ARCHIVED"}
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Answer</span>
            <AdminTextarea
              className="mt-2 min-h-44"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={5000}
              disabled={pending || item?.status === "ARCHIVED"}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Category</span>
              <AdminInput
                className="mt-2"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                disabled={pending || item?.status === "ARCHIVED"}
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Order</span>
              <AdminInput
                className="mt-2"
                type="number"
                min={0}
                max={100000}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                disabled={pending || item?.status === "ARCHIVED"}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            {!item ? (
              <AdminButton type="button" onClick={createDraft} loading={pending} disabled={!validDraft}>
                Create draft
              </AdminButton>
            ) : item.status !== "ARCHIVED" ? (
              <>
                <AdminButton type="button" variant="secondary" onClick={saveDraft} loading={pending} disabled={!validDraft}>
                  Save draft
                </AdminButton>
                <AdminButton type="button" onClick={publish} loading={pending} disabled={!validDraft || draftDirty}>
                  Publish
                </AdminButton>
                {item.status === "PUBLISHED" ? (
                  <AdminButton type="button" variant="secondary" onClick={hide} loading={pending}>
                    Hide
                  </AdminButton>
                ) : null}
                <AdminButton type="button" variant="destructive" onClick={archive} loading={pending}>
                  Archive
                </AdminButton>
              </>
            ) : null}
          </div>

          {item && draftDirty ? (
            <p className="text-sm font-bold text-amber-700" role="status">
              Save this draft before publishing the current edits.
            </p>
          ) : null}
          {message ? <p className="text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
          {conflict ? (
            <AdminButton type="button" variant="secondary" onClick={() => window.location.reload()}>
              Reload latest
            </AdminButton>
          ) : null}
        </AdminSectionCard>

        {item ? (
          <AdminSectionCard className="p-5">
            <h2 className="text-base font-black text-slate-950">Publishing state</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <State label="Draft version" value={`v${item.version}`} />
              <State label="Published version" value={item.publishedVersion ? `v${item.publishedVersion}` : "Not published"} />
              <State label="Unpublished changes" value={hasUnpublishedChanges ? "Yes" : "No"} />
              <State label="Published at" value={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "—"} />
            </div>
          </AdminSectionCard>
        ) : null}
      </div>

      <AdminSectionCard className="h-fit p-5 xl:sticky xl:top-24">
        <p className="text-xs font-black uppercase tracking-wide text-indigo-700">Draft preview</p>
        <h2 className="mt-2 text-lg font-black text-slate-950">{question.trim() || "FAQ question"}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {answer.trim() || "The FAQ answer preview will appear here."}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
          <span>{category.trim() || "General"}</span>
          <span>Order {sortOrder || "0"}</span>
        </div>
      </AdminSectionCard>
    </div>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
