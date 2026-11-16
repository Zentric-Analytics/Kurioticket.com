"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { requestCmsDiscard, useCmsNavigationGuard } from "@/lib/cmsNavigationGuard";
import { cmsReorderLabel as labelFor, sameCmsOrder } from "@/lib/cmsDirectoryPresentation";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, LoaderCircle } from "lucide-react";

export type CmsReorderRow = {
  id: string;
  key: string;
  market: string;
  sortOrder: number;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  draftPayload: unknown;
};


function moveId(ids: readonly string[], from: string, to: string): string[] {
  const fromIndex = ids.indexOf(from);
  const toIndex = ids.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...ids];
  const next = [...ids];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
}

export function CmsCardReorder({
  rows, section, market, onDone,
}: {
  rows: CmsReorderRow[];
  section: "destinations" | "flight-routes";
  market: string;
  onDone: (message?: string) => void;
}) {
  const router = useRouter();
  const [ids, setIds] = useState(() => rows.filter(row => row.status !== "ARCHIVED").map(row => row.id));
  const [originalIds] = useState(() => rows.filter(row => row.status !== "ARCHIVED").map(row => row.id));
  const changed = !sameCmsOrder(ids, originalIds);
  const [pending, setPending] = useState(false);
  const navigationGuard = useCmsNavigationGuard(changed, pending);
  const [error, setError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);
  const dragPointerY = useRef<number | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const byId = new Map(rows.map(row => [row.id, row]));
  const original = rows.filter(row => row.status !== "ARCHIVED");
  const archived = rows.filter(row => row.status === "ARCHIVED");

  function move(from: string, to: string) {
    if (pending) return;
    setIds(current => {
      const next = moveId(current, from, to);
      return next;
    });
    setError(null);
  }

  function moveBy(id: string, offset: number) {
    const index = ids.indexOf(id);
    const target = ids[index + offset];
    if (target) move(id, target);
  }

  function onHandleKeys(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveBy(id, event.key === "ArrowUp" ? -1 : 1);
    }
  }

  function stopDragging() {
    draggingId.current = null;
    dragPointerY.current = null;
    setActiveDrag(null);
    if (scrollFrame.current !== null) {
      window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    }
  }

  // A touch grip disables native panning. Keep the page moving while the
  // captured pointer stays near a viewport edge so off-screen cards are
  // reachable without dozens of manual arrow presses.
  function autoScrollWhileDragging() {
    if (!draggingId.current || dragPointerY.current === null) {
      scrollFrame.current = null;
      return;
    }
    const edge = 88;
    const y = dragPointerY.current;
    const height = window.innerHeight;
    const up = y < edge ? -(edge - Math.max(0, y)) / edge : 0;
    const down = y > height - edge ? (edge - Math.max(0, height - y)) / edge : 0;
    const step = Math.round((up + down) * 16);
    if (step !== 0) window.scrollBy(0, step);
    scrollFrame.current = window.requestAnimationFrame(autoScrollWhileDragging);
  }

  useEffect(() => {
    return () => {
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
    };
  }, []);

  function onDragStart(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (pending || event.button !== 0) return;
    draggingId.current = id;
    dragPointerY.current = event.clientY;
    setActiveDrag(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (scrollFrame.current === null) {
      scrollFrame.current = window.requestAnimationFrame(autoScrollWhileDragging);
    }
  }

  function onDragMove(event: PointerEvent<HTMLButtonElement>) {
    if (!draggingId.current) return;
    dragPointerY.current = event.clientY;
  }

  function onDragEnd(event: PointerEvent<HTMLButtonElement>) {
    const dragged = draggingId.current;
    stopDragging();
    if (!dragged) return;
    const underPointer = document.elementFromPoint(event.clientX, event.clientY);
    const target = underPointer?.closest<HTMLElement>("[data-card-reorder-id]");
    if (target?.dataset.cardReorderId) move(dragged, target.dataset.cardReorderId);
  }

  async function save() {
    if (!changed || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: section === "destinations" ? "HOMEPAGE_DESTINATION" : "FLIGHT_ROUTE",
          market,
          locale: "en",
          items: ids.map(id => ({ id, version: byId.get(id)!.version })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "Could not save this draft order.");
        return;
      }
      navigationGuard.allowNavigation();
      router.refresh();
      onDone("Draft order saved. Publish each changed card to apply the new order to the public homepage.");
    } catch {
      setError("Could not save the order. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label={section === "destinations" ? "Reorder homepage destinations" : "Reorder flight routes"} className="space-y-3 rounded-lg border border-[#D8E1EC] bg-white p-3 sm:p-4">
      <div>
        <h2 className="text-[14px] font-semibold text-[#111827]">Reorder cards</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Drag the grip, use the up/down buttons, or focus the grip and press the arrow keys. Only this market is affected. Saving changes draft positions, not the live homepage.</p>
      </div>
      <div className="space-y-1.5">
        {ids.map((id, index) => {
          const row = byId.get(id);
          if (!row) return null;
          return (
            <div
              key={id}
              data-card-reorder-id={id}
              className={"flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 transition-colors sm:px-3 " +
                (activeDrag === id ? "border-[#6D28D9] bg-[#F5F3FF]" : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]")}
            >
              <button type="button" aria-label={`Drag ${labelFor(row, section)}. Press up or down arrows to move.`}
                onKeyDown={event => onHandleKeys(event, id)}
                onPointerDown={event => onDragStart(event, id)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={stopDragging}
                disabled={pending}
                className="touch-none cursor-grab rounded-md p-2 text-[#64748B] focus-visible:outline-2 focus-visible:outline-[#6D28D9] active:cursor-grabbing disabled:cursor-not-allowed">
                <GripVertical size={17} aria-hidden="true" />
              </button>
              <span className="w-7 shrink-0 text-center text-[13px] font-medium tabular-nums text-[#475569]">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#111827]">{labelFor(row, section)}</p>
                <p className="text-[11px] text-[#64748B]">{row.status === "PUBLISHED" ? "Published — reorder is draft only" : row.status === "HIDDEN" ? "Hidden" : "Draft"}</p>
              </div>
              <button type="button" aria-label={`Move ${labelFor(row, section)} up`} onClick={() => moveBy(id, -1)}
                disabled={pending || index === 0}
                className="cursor-pointer rounded-md p-2 text-[#475569] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-30">
                <ArrowUp size={16} aria-hidden="true" />
              </button>
              <button type="button" aria-label={`Move ${labelFor(row, section)} down`} onClick={() => moveBy(id, 1)}
                disabled={pending || index === ids.length - 1}
                className="cursor-pointer rounded-md p-2 text-[#475569] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-30">
                <ArrowDown size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      {archived.length > 0 ? (
        <p className="text-[12px] text-[#64748B]">{archived.length} archived record(s) are excluded from reordering.</p>
      ) : null}
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!changed || pending} onClick={save}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[13px] font-medium text-white hover:bg-[#303846] disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? <LoaderCircle size={15} aria-hidden="true" className="animate-spin" /> : null}
          Save draft order
        </button>
        <button type="button" disabled={pending} onClick={() => { if (requestCmsDiscard()) onDone(); }}
          className="h-9 cursor-pointer rounded-lg border border-[#D8E1EC] px-3.5 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-40">
          Cancel
        </button>
        <span className="text-[12px] text-[#64748B]">{changed ? "Unsaved order changes" : `${original.length} cards`}</span>
      </div>
    </section>
  );
}
