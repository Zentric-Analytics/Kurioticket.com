"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ProviderRetestButton({ provider = "duffel" }: { provider?: "duffel" | "kayak-sandbox" }) {
  const router = useRouter();
  const providerLabel = provider === "duffel" ? "Duffel" : "KAYAK";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function retest() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/providers/" + (provider === "duffel" ? "duffel" : "kayak") + "/retest", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const data: { error?: string; message?: string; provider?: { connected?: boolean } } | null =
        await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error || "Retest failed. Please try again.");
        return;
      }
      setMessage(data?.message || (data?.provider?.connected
        ? providerLabel + " health check succeeded."
        : providerLabel + " health check failed. Review credentials and server logs."));
      // Refresh server-rendered health values without discarding this message.
      router.refresh();
    } catch {
      setMessage("Unable to reach the health-check service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <Button type="button" onClick={retest} disabled={loading}>
        {loading ? "Retesting..." : "Retest " + providerLabel}
      </Button>
      {message ? <p role="status" aria-live="polite" className="text-[12px] leading-5 text-[#475569]">{message}</p> : null}
    </div>
  );
}
