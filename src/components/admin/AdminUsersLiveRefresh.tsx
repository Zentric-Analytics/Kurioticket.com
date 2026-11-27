"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  adminUsersRefreshQuietMs, createAdminUsersRefreshController, hasOpenAdminUsersInteraction, isAdminUsersRefreshPath,
  probeAdminUsersRefresh, type AdminUsersRefreshState,
} from "@/lib/adminUsersLiveRefresh";

type Position = { x: number; y: number; scrollVersion: number; route: string; anchors: { key: string; top: number }[] };
const routeNow = () => window.location.pathname + window.location.search;

function rememberPosition(root: HTMLElement | null, scrollVersion: number): Position {
  const anchors: Position["anchors"] = [];
  if (window.scrollY > 0 && root) {
    for (const node of root.querySelectorAll<HTMLElement>("[data-users-refresh-anchor]")) {
      const bounds = node.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) continue;
      const key = node.dataset.usersRefreshAnchor;
      if (key) anchors.push({ key, top: bounds.top });
      if (anchors.length === 3) break;
    }
  }
  return { x: window.scrollX, y: window.scrollY, scrollVersion, route: routeNow(), anchors };
}

function restorePosition(root: HTMLElement | null, position: Position, scrollVersion: number) {
  if (position.route !== routeNow() || position.scrollVersion !== scrollVersion) return;
  for (const anchor of position.anchors) {
    const node = Array.from(root?.querySelectorAll<HTMLElement>("[data-users-refresh-anchor]") ?? [])
      .find(item => item.dataset.usersRefreshAnchor === anchor.key && item.getClientRects().length > 0);
    if (node) {
      window.scrollTo({ left: position.x, top: window.scrollY + node.getBoundingClientRect().top - anchor.top, behavior: "instant" });
      return;
    }
  }
  window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
}

/** Server records refresh in place; applied URL filters and client drafts remain separate. */
export function AdminUsersLiveRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const scope = pathname + (search ? "?" + search : "");
  const enabled = isAdminUsersRefreshPath(pathname);
  const usersControls = enabled || pathname === "/admin/users/online";
  const root = useRef<HTMLDivElement>(null);
  const [observation, setObservation] = useState<{ scope: string; state: AdminUsersRefreshState }>({ scope, state: "live" });
  const state = observation.scope === scope ? observation.state : "live";
  const [review, setReview] = useState({ scope, open: false });
  const reviewingActivity = review.scope === scope && review.open;
  const [committedContent, setCommittedContent] = useState({ scope, children });
  // A server refresh may already be pending when an action is opened. Keep
  // that same-route content available while it is being read; the newest
  // payload remains in props and is released when the action closes. Explicit
  // navigation and authorization failure always take precedence.
  const holdContent = enabled && reviewingActivity && committedContent.scope === scope && state !== "authorization";
  if (!holdContent && (committedContent.scope !== scope || committedContent.children !== children)) {
    setCommittedContent({ scope, children });
  }
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(pending);
  const interactionAt = useRef(0);
  const scrollVersion = useRef(0);
  const operation = useRef<{ resolve: () => void; position: Position } | null>(null);

  useLayoutEffect(() => {
    pendingRef.current = pending;
    if (pending || !operation.current) return;
    const completed = operation.current;
    operation.current = null;
    restorePosition(root.current, completed.position, scrollVersion.current);
    completed.resolve();
  }, [pending]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const startedRoute = routeNow();
    const controller = createAdminUsersRefreshController({
      availability: () => {
        if (document.visibilityState !== "visible") return "hidden";
        if (!navigator.onLine) return "offline";
        if (pendingRef.current || routeNow() !== startedRoute
          || root.current?.querySelector('[data-users-navigation-pending="true"]')) return "pending";
        // Merely focusing a field must not prevent updates indefinitely.
        if (Date.now() - interactionAt.current < adminUsersRefreshQuietMs
          || hasOpenAdminUsersInteraction()) return "interacting";
        return "ready";
      },
      probe: signal => probeAdminUsersRefresh(signal),
      refresh: () => new Promise<void>(resolve => {
        if (!active) { resolve(); return; }
        operation.current = { resolve, position: rememberPosition(root.current, scrollVersion.current) };
        startTransition(() => router.refresh());
      }),
      unauthorized: () => { if (active) startTransition(() => router.refresh()); },
      state: value => { if (active) setObservation({ scope, state: value }); },
    });
    const resume = () => controller.resume();
    const interacted = () => { interactionAt.current = Date.now(); };
    const scrolled = () => { scrollVersion.current += 1; };
    const pageShown = (event: PageTransitionEvent) => { if (event.persisted) resume(); };
    const reviewChanged = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.matches('[data-activity-id] details')) return;
      setReview({ scope, open: Boolean(root.current?.querySelector('[data-activity-id] details[open]')) });
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    window.addEventListener("pageshow", pageShown);
    document.addEventListener("input", interacted, true);
    document.addEventListener("keydown", interacted, true);
    document.addEventListener("pointerdown", interacted, true);
    document.addEventListener("toggle", reviewChanged, true);
    window.addEventListener("scroll", scrolled, { passive: true, capture: true });
    controller.start();
    return () => {
      active = false;
      controller.dispose();
      operation.current?.resolve();
      operation.current = null;
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      window.removeEventListener("pageshow", pageShown);
      document.removeEventListener("input", interacted, true);
      document.removeEventListener("keydown", interacted, true);
      document.removeEventListener("pointerdown", interacted, true);
      document.removeEventListener("toggle", reviewChanged, true);
      window.removeEventListener("scroll", scrolled, true);
    };
  }, [enabled, scope, router]);

  const message = state === "offline" ? "Offline · updates resume when connected"
    : state === "delayed" ? "Updates delayed · retrying automatically"
    : state === "authorization" ? "Checking your access…"
    : reviewingActivity ? "Updates paused while reviewing details"
    : "Updates automatically";
  return <div ref={root} className={"min-w-0" + (usersControls ? " max-md:[&_input:not([type=hidden])]:text-base max-md:[&_textarea]:text-base" : "")}
    data-users-live-refresh={enabled ? "enabled" : undefined} data-users-refresh-state={enabled ? state : undefined}>
    {enabled ? <div className="mb-2 flex min-h-4 justify-end text-[11px] leading-4 text-[#64748B]">
      <span role={state === "delayed" || state === "offline" || state === "authorization" || reviewingActivity ? "status" : undefined}
        data-testid="users-live-refresh-status">{message}</span>
    </div> : null}
    {state === "authorization" ? null : holdContent ? committedContent.children : children}
  </div>;
}
