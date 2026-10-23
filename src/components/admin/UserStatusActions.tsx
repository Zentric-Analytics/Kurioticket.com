"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, PauseCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type UserStatusActionsProps = {
  userId: string;
  email?: string | null;
  role: string;
  status: string;
  isSelf: boolean;
  isProtectedAdmin: boolean;
};

const editableRoles = ["USER", "SUPPORT"] as const;

export function UserStatusActions({
  userId,
  email,
  role,
  status,
  isSelf,
  isProtectedAdmin,
}: UserStatusActionsProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerBoundsRef = useRef<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuId = useId();

  function closeMenu(restoreFocus = true) {
    setMenuPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openMenu() {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    triggerBoundsRef.current = bounds;
    const spaceBelow = window.innerHeight - bounds.bottom - 16;
    const height = Math.min(320, Math.max(spaceBelow, bounds.top - 16));
    setMenuPosition({
      ...(spaceBelow >= height
        ? { top: bounds.bottom + 6 }
        : { bottom: window.innerHeight - bounds.top + 6 }),
      right: Math.max(
        8,
        Math.min(window.innerWidth - bounds.right, window.innerWidth - 248),
      ),
      maxHeight: height,
    });
  }

  useEffect(() => {
    if (!menuPosition) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setMenuPosition(null);
      }
    };
    const reposition = (event: Event) => {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      )
        return;
      const bounds = triggerRef.current?.getBoundingClientRect();
      // A scroll queued before opening (for example, bringing the trigger into
      // view) must not immediately dismiss the newly opened menu.
      if (
        event.type === "scroll" &&
        bounds?.top === triggerBoundsRef.current?.top &&
        bounds?.right === triggerBoundsRef.current?.right
      )
        return;
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

  useEffect(() => {
    if (showPermanentDelete) dialogRef.current?.showModal();
  }, [showPermanentDelete]);

  function closePermanentDelete() {
    dialogRef.current?.close();
    setShowPermanentDelete(false);
    setConfirmation("");
    triggerRef.current?.focus();
  }

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ) || [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      closeMenu();
      if (event.key === "Tab") {
        // Resume the document's tab order from the trigger after removing the portal.
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
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
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

  const confirmationTarget = email?.trim() || userId;
  const canChangeRole = !isSelf && !isProtectedAdmin && role === "ADMIN";
  const canChangeStatus = !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const canHardDelete =
    status === "DELETED" && !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const confirmationMatches = email?.trim()
    ? confirmation.trim().toLowerCase() === email.trim().toLowerCase()
    : confirmation === userId;

  async function updateStatus(nextStatus: "ACTIVE" | "SUSPENDED" | "DELETED") {
    if (nextStatus === "SUSPENDED" && !window.confirm("Suspend this account? You can reactivate it later.")) return;
    if (nextStatus === "DELETED" && !window.confirm(
      "Delete this account? It will be marked as deleted and can be restored. This does not permanently erase the account."
    )) return;

    setLoading(nextStatus);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Action failed.");
        return;
      }
      setMessage(data.message || "Updated.");
      window.location.reload();
    } catch {
      setMessage("Action failed. Please try again.");
    } finally {
      setLoading("");
    }
  }

  async function updateRole(nextRole: "USER" | "SUPPORT") {
    if (!window.confirm(`Confirm role change to ${nextRole} for this user?`))
      return;

    setLoading(`ROLE_${nextRole}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Role update failed.");
        return;
      }
      setMessage(data.message || "Role updated.");
      window.location.reload();
    } catch {
      setMessage("Role update failed. Please try again.");
    } finally {
      setLoading("");
    }
  }

  async function permanentlyDeleteUser() {
    setLoading("PERMANENT_DELETE");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/permanent`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          email?.trim()
            ? { confirmEmail: confirmation }
            : { confirmUserId: confirmation },
        ),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "Permanent delete failed.");
        return;
      }

      setMessage(data.message || "User permanently deleted.");
      window.location.reload();
    } catch {
      setMessage("Permanent delete failed. Please try again.");
    } finally {
      setLoading("");
    }
  }

  if (isSelf)
    return (
      <span className="text-xs font-semibold text-muted">Current admin</span>
    );

  if (isProtectedAdmin) {
    return (
      <span className="text-xs font-semibold text-muted">Protected admin</span>
    );
  }

  const menuItem =
    "focus-ring flex min-h-9 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] font-medium text-[#020617] transition-colors hover:bg-[#F8FAFC] focus-visible:bg-[#F1F7FF] disabled:opacity-50";
  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Manage account for ${email || userId}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(menuPosition)}
        aria-controls={menuPosition ? menuId : undefined}
        disabled={Boolean(loading)}
        onClick={() => (menuPosition ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
      >
        {loading ? "Updating…" : "Manage"}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={`Account actions for ${email || userId}`}
              onKeyDown={navigateMenu}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node) &&
                  event.relatedTarget !== triggerRef.current
                )
                  closeMenu(false);
              }}
              style={menuPosition}
              className="fixed z-50 w-56 overflow-y-auto rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.28)]"
            >
              {canChangeRole
                ? editableRoles.map((editableRole) => (
                    <button
                      key={editableRole}
                      role="menuitem"
                      type="button"
                      className={menuItem}
                      disabled={Boolean(loading)}
                      onClick={() => {
                        closeMenu();
                        void updateRole(editableRole);
                      }}
                    >
                      {editableRole === "USER"
                        ? "Demote to User"
                        : "Make Support"}
                    </button>
                  ))
                : null}
              {canChangeStatus && status !== "ACTIVE" ? (
                <button
                  role="menuitem"
                  type="button"
                  className={menuItem}
                  disabled={Boolean(loading)}
                  onClick={() => {
                    closeMenu();
                    void updateStatus("ACTIVE");
                  }}
                >
                  <RotateCcw size={15} aria-hidden="true" className="shrink-0 text-[#475569]" />
                  Reactivate
                </button>
              ) : null}
              {canChangeStatus && status !== "SUSPENDED" ? (
                <button
                  role="menuitem"
                  type="button"
                  className={menuItem}
                  disabled={Boolean(loading)}
                  onClick={() => {
                    closeMenu();
                    void updateStatus("SUSPENDED");
                  }}
                >
                  <PauseCircle size={15} aria-hidden="true" className="shrink-0 text-[#475569]" />
                  Suspend
                </button>
              ) : null}
              {canChangeStatus && status !== "DELETED" ? (
                <button
                  role="menuitem"
                  type="button"
                  className={`${menuItem} text-[#B91C1C] hover:bg-[#FFF7F7]`}
                  disabled={Boolean(loading)}
                  onClick={() => {
                    closeMenu();
                    void updateStatus("DELETED");
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" className="shrink-0 text-[#B91C1C]" />
                  Delete
                </button>
              ) : null}
              {role === "ADMIN" ? (
                <p className="px-3 py-2 text-xs leading-5 text-slate-500">
                  Demote before status changes or permanent deletion.
                </p>
              ) : null}
              {canHardDelete ? (
                <button
                  role="menuitem"
                  type="button"
                  className={`${menuItem} border-t border-slate-100 text-red-700`}
                  disabled={Boolean(loading)}
                  onClick={() => {
                    closeMenu();
                    setMessage("");
                    setConfirmation("");
                    setShowPermanentDelete(true);
                  }}
                >
                  Permanent delete…
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {showPermanentDelete && canHardDelete
        ? createPortal(
            <dialog
              ref={dialogRef}
              aria-labelledby={`${menuId}-delete-title`}
              aria-describedby={`${menuId}-delete-description`}
              onCancel={(event) => {
                if (loading) event.preventDefault();
                else closePermanentDelete();
              }}
              className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-xl backdrop:bg-slate-950/30"
            >
              <h3
                id={`${menuId}-delete-title`}
                className="font-semibold text-slate-950"
              >
                Permanently delete account
              </h3>
              <p id={`${menuId}-delete-description`} className="mt-2">
                This permanently removes the user record and cannot be undone.
              </p>
              <label className="mt-4 grid gap-2">
                <span>
                  Type {email?.trim() ? "this email" : "this user id"} to
                  confirm:
                </span>
                <code className="break-all rounded bg-slate-50 p-2 text-xs">
                  {confirmationTarget}
                </code>
                <input
                  autoFocus
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="focus-ring min-w-0 rounded-md border border-slate-300 px-3 py-2"
                  autoComplete="off"
                  disabled={Boolean(loading)}
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={Boolean(loading) || !confirmationMatches}
                  onClick={permanentlyDeleteUser}
                >
                  {loading === "PERMANENT_DELETE"
                    ? "Deleting..."
                    : "Confirm permanent delete"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(loading)}
                  onClick={closePermanentDelete}
                >
                  Cancel
                </Button>
              </div>
              {message ? (
                <p role="status" className="mt-3 text-xs text-red-700">
                  {message}
                </p>
              ) : null}
            </dialog>,
            document.body,
          )
        : null}
      {message && !showPermanentDelete ? (
        <p role="status" className="mt-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
