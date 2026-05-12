"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function RedirectClient() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Preparing secure partner redirect...");
  const id = params.get("id");
  const type = params.get("type") as "flight" | "hotel" | null;
  const missingTarget = !id || !type;

  useEffect(() => {
    if (missingTarget) return;

    const timeout = window.setTimeout(async () => {
      const response = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, sourcePage: "redirect_confirmation" }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error || "Partner redirect is unavailable. Please search again.");
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [id, missingTarget, type]);

  return (
    <main className="page-shell flex flex-1 items-center justify-center py-12">
      <Card className="max-w-xl p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy">Secure partner redirect</h1>
        <p className="mt-3 text-muted">
          You are being redirected securely to complete your booking through the airline or trusted travel partner.
        </p>
        <p className="mt-4 text-sm font-semibold text-teal-dark">
          {missingTarget ? "Redirect link is missing. Please search again." : message}
        </p>
      </Card>
    </main>
  );
}
