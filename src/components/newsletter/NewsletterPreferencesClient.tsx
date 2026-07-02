"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

type PreferenceStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "NOT_FOUND";

type ApiResponse = {
  ok: boolean;
  email?: string;
  status?: PreferenceStatus;
  message?: string;
};

export function NewsletterPreferencesClient({ email, token }: { email: string; token: string }) {
  const { t } = useLocale();
  const [address, setAddress] = useState(email);
  const [status, setStatus] = useState<PreferenceStatus | "LOADING">("LOADING");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (token) params.set("token", token);

    async function load() {
      try {
        const response = await fetch(`/api/newsletter/preferences?${params.toString()}`);
        const data = (await response.json()) as ApiResponse;
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setStatus("NOT_FOUND");
          setMessage(data.message || t["emailUpdates.invalidLink"] || enTranslations["emailUpdates.invalidLink"]);
          return;
        }
        setAddress(data.email || email);
        setStatus(data.status || "NOT_FOUND");
      } catch {
        if (!cancelled) {
          setStatus("NOT_FOUND");
          setMessage(t["emailUpdates.loadError"] || enTranslations["emailUpdates.loadError"]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [email, t, token]);

  async function save(action: "subscribe" | "unsubscribe") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, token, action }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) {
        setMessage(data.message || t["emailUpdates.updateError"] || enTranslations["emailUpdates.updateError"]);
        return;
      }
      setStatus(data.status || (action === "subscribe" ? "SUBSCRIBED" : "UNSUBSCRIBED"));
      setMessage(data.message || t["emailUpdates.preferenceUpdated"] || enTranslations["emailUpdates.preferenceUpdated"]);
    } catch {
      setMessage(t["emailUpdates.updateError"] || enTranslations["emailUpdates.updateError"]);
    } finally {
      setPending(false);
    }
  }

  const isSubscribed = status === "SUBSCRIBED";
  const isStopped = status === "UNSUBSCRIBED";

  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#004BB8]">{t["emailUpdates.eyebrow"] || enTranslations["emailUpdates.eyebrow"]}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{t["emailUpdates.title"] || enTranslations["emailUpdates.title"]}</h1>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
        {t["emailUpdates.description"] || enTranslations["emailUpdates.description"]}
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t["emailUpdates.emailLabel"] || enTranslations["emailUpdates.emailLabel"]}</p>
        <p className="mt-1 break-words text-base font-bold text-slate-950">{address || t["emailUpdates.notAvailable"] || enTranslations["emailUpdates.notAvailable"]}</p>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {status === "LOADING" ? t["emailUpdates.loadingStatus"] || enTranslations["emailUpdates.loadingStatus"] : isSubscribed ? t["emailUpdates.subscribedStatus"] || enTranslations["emailUpdates.subscribedStatus"] : isStopped ? t["emailUpdates.unsubscribedStatus"] || enTranslations["emailUpdates.unsubscribedStatus"] : t["emailUpdates.notFoundStatus"] || enTranslations["emailUpdates.notFoundStatus"]}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="focus-ring rounded-xl bg-[#004BB8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={pending || status === "LOADING" || isSubscribed}
          onClick={() => save("subscribe")}
        >
          {isSubscribed ? t["emailUpdates.subscribedButton"] || enTranslations["emailUpdates.subscribedButton"] : t["emailUpdates.subscribeButton"] || enTranslations["emailUpdates.subscribeButton"]}
        </button>
        <button
          type="button"
          className="focus-ring rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={pending || status === "LOADING" || status === "NOT_FOUND" || isStopped}
          onClick={() => save("unsubscribe")}
        >
          {isStopped ? t["emailUpdates.updatesStopped"] || enTranslations["emailUpdates.updatesStopped"] : t["emailUpdates.stopUpdates"] || enTranslations["emailUpdates.stopUpdates"]}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-[#004BB8]/8 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    </section>
  );
}
