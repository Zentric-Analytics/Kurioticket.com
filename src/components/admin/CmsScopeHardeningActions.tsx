"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type Props = {
  type: string;
  market: string;
  locale: string;
  scopeVersion: number;
  legacyFallbackRetired: boolean;
  fallbackRetirementEligible: boolean;
  draftOrderCollisionCount: number;
  draftOrderNeedsNormalization: boolean;
};

type ScopeAction =
  | "normalize_draft_order"
  | "retire_legacy_fallback"
  | "reactivate_legacy_fallback";

export function CmsScopeHardeningActions({
  type,
  market,
  locale,
  scopeVersion,
  legacyFallbackRetired,
  fallbackRetirementEligible,
  draftOrderCollisionCount,
  draftOrderNeedsNormalization,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerBoundsRef = useRef<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const needsDraftNormalization =
    draftOrderNeedsNormalization || draftOrderCollisionCount > 0;

  function closeMenu(restoreFocus = true) {
    setMenuPosition(null);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function openMenu() {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    triggerBoundsRef.current = bounds;
    const spaceBelow = window.innerHeight - bounds.bottom - 16;
    const availableHeight = Math.min(
      260,
      Math.max(spaceBelow, bounds.top - 16),
    );

    setMenuPosition({
      ...(spaceBelow >= availableHeight
        ? { top: bounds.bottom + 6 }
        : { bottom: window.innerHeight - bounds.top + 6 }),
      right: Math.max(
        8,
        Math.min(window.innerWidth - bounds.right, window.innerWidth - 248),
      ),
      maxHeight: availableHeight,
    });
  }

  useEffect(() => {
    if (!menuPosition) return;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus({ preventScroll: true });

    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setMenuPosition(null);
      }
    };

    const reposition = (event: Event) => {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      const bounds = triggerRef.current?.getBoundingClientRect();
      if (
        event.type === "scroll" &&
        bounds?.top === triggerBoundsRef.current?.top &&
        bounds?.right === triggerBoundsRef.current?.right
      ) {
        return;
      }

      setMenuPosition(null);
      triggerRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [menuPosition]);

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      ) || [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      closeMenu();

      if (event.key === "Tab") {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input, select, [tabindex="0"]',
          ),
        ).filter(
          (item) =>
            !menuRef.current?.contains(item) && item.getClientRects().length,
        );
        controls[
          controls.indexOf(triggerRef.current!) + (event.shiftKey ? -1 : 1)
        ]?.focus();
      }
      return;
    }

    if (
      items.length > 0 &&
      ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  }

  function run(action: ScopeAction) {
    closeMenu();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/content/scope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          type,
          market,
          locale,
          expectedScopeVersion: scopeVersion,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          response.status === 409
            ? "This CMS scope changed in another session. Reload before retrying."
            : typeof body.error === "string"
              ? body.error
              : "Unable to update CMS scope.",
        );
        return;
      }

      window.location.reload();
    });
  }

  const menuItemClass =
    "focus-ring flex min-h-9 w-full items-center rounded-md px-3 py-2.5 text-left text-[13px] font-medium text-[#020617] transition-colors hover:bg-[#F8FAFC] focus-visible:bg-[#F1F7FF]";

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Manage CMS scope for ${market} ${locale}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(menuPosition)}
        aria-controls={menuPosition ? menuId : undefined}
        disabled={pending}
        onClick={() => (menuPosition ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
          if (event.key === "Escape") closeMenu();
        }}
        className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D8E1EC] bg-white px-2.5 text-[12px] font-medium text-[#020617] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
      >
        {pending ? "Updating…" : "Manage"}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={menuPosition ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      {menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={`CMS scope actions for ${market} ${locale}`}
              onKeyDown={navigateMenu}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node) &&
                  event.relatedTarget !== triggerRef.current
                ) {
                  closeMenu(false);
                }
              }}
              style={menuPosition}
              className="fixed z-50 w-60 overflow-y-auto rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.28)]"
            >
              {needsDraftNormalization ? (
                <button
                  role="menuitem"
                  type="button"
                  className={menuItemClass}
                  disabled={pending}
                  onClick={() => run("normalize_draft_order")}
                >
                  Normalize draft order
                </button>
              ) : null}

              {legacyFallbackRetired ? (
                <button
                  role="menuitem"
                  type="button"
                  className={menuItemClass}
                  disabled={pending}
                  onClick={() => run("reactivate_legacy_fallback")}
                >
                  Reactivate fallback
                </button>
              ) : fallbackRetirementEligible ? (
                <button
                  role="menuitem"
                  type="button"
                  className={menuItemClass}
                  disabled={pending}
                  onClick={() => run("retire_legacy_fallback")}
                >
                  Retire fallback
                </button>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  aria-disabled="true"
                  className="focus-ring w-full cursor-not-allowed rounded-md px-3 py-2.5 text-left"
                  onClick={(event) => event.preventDefault()}
                >
                  <span className="block text-[13px] font-medium text-[#94A3B8]">
                    Retire fallback
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[#94A3B8]">
                    Resolve published CMS integrity issues first.
                  </span>
                </button>
              )}
            </div>,
            document.body,
          )
        : null}

      {error ? (
        <p className="mt-1.5 max-w-60 text-[12px] font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
