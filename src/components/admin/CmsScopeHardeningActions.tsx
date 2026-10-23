"use client";

import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

type Props = {
  type: string;
  market: string;
  locale: string;
  scopeVersion: number;
  legacyFallbackRetired: boolean;
  fallbackRetirementEligible: boolean;
  draftOrderCollisionCount: number;
};

export function CmsScopeHardeningActions({
  type,
  market,
  locale,
  scopeVersion,
  legacyFallbackRetired,
  fallbackRetirementEligible,
  draftOrderCollisionCount,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: "normalize_draft_order" | "retire_legacy_fallback" | "reactivate_legacy_fallback") {
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => run("normalize_draft_order")}
          loading={pending}
          disabled={pending || draftOrderCollisionCount === 0}
        >
          Normalize draft order
        </AdminButton>

        {legacyFallbackRetired ? (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => run("reactivate_legacy_fallback")}
            loading={pending}
            disabled={pending}
          >
            Reactivate legacy fallback
          </AdminButton>
        ) : (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => run("retire_legacy_fallback")}
            loading={pending}
            disabled={pending || !fallbackRetirementEligible}
          >
            Retire legacy fallback
          </AdminButton>
        )}
      </div>

      {error ? (
        <p className="text-xs font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
