"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useJourneyEvents } from "@/components/privacy/JourneyEventsProvider";
import type { ProviderHandoffMetadataReader } from "@/lib/providerHandoffClient";

export function RedirectClient() {
  const params = useSearchParams();
  const { t } = useLocale();
  const [message, setMessage] = useState(t["redirect.loading"]);
  const journeyEvents = useJourneyEvents();
  const handoffFactory = useRef(journeyEvents.prepareHandoff);
  const action = useRef<{ key: string; metadata: ProviderHandoffMetadataReader } | null>(null);
  const id = params.get("id");
  const type = params.get("type") as "flight" | "hotel" | null;
  const missingTarget = !id || (type !== "flight" && type !== "hotel");

  useEffect(() => { handoffFactory.current = journeyEvents.prepareHandoff; }, [journeyEvents]);

  useEffect(() => {
    if (missingTarget) return;

    const timeout = window.setTimeout(async () => {
      const key = JSON.stringify([id, type]);
      if (action.current?.key !== key) action.current = { key, metadata: handoffFactory.current(type, id) };
      const response = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, sourcePage: "redirect_confirmation", ...action.current.metadata() }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error || t["redirect.missingTarget"]);
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [id, missingTarget, t, type]);

  return (
    <main className="page-shell flex flex-1 items-center justify-center py-12">
      <Card className="max-w-xl p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy">{t["redirect.title"]}</h1>
        <p className="mt-3 text-muted">
          {t["redirect.description"]}
        </p>
        <p className="mt-4 text-sm font-semibold text-teal-dark">
          {missingTarget ? t["redirect.missingTarget"] : message}
        </p>
      </Card>
    </main>
  );
}
