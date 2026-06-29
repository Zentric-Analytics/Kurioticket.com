"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type NewsletterStatusResponse = {
  authenticated?: boolean;
  email?: string;
  status?: "SUBSCRIBED" | "UNSUBSCRIBED" | "NOT_FOUND";
};

const accountContextClassName = "kurioticket-newsletter-account-context";

export function NewsletterSessionBridge() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (pathname !== "/" || status === "loading") return;

    const email = status === "authenticated" ? session?.user?.email?.trim() : "";
    const input = document.querySelector<HTMLInputElement>('main input[type="email"]');
    const form = input?.closest("form") as HTMLFormElement | null;
    const container = form?.parentElement || null;

    if (!input || !form || !container) return;

    const existingContext = container.querySelector(`.${accountContextClassName}`);
    existingContext?.remove();

    if (!email) {
      restoreGuestNewsletterForm(input, form);
      return;
    }

    const accountEmail = email;

    applyReactControlledInputValue(input, accountEmail);
    input.required = false;
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    input.style.display = "none";

    const accountContext = document.createElement("div");
    accountContext.className = `${accountContextClassName} rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 sm:max-w-[34rem]`;
    accountContext.textContent = `Updates will be sent to your account email: ${accountEmail}`;
    container.insertBefore(accountContext, form);

    let cancelled = false;

    async function refreshNewsletterStatus() {
      try {
        const response = await fetch("/api/newsletter/subscribe", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) return;

        const data = (await response.json()) as NewsletterStatusResponse;
        if (cancelled || data.email?.toLowerCase() !== accountEmail.toLowerCase()) return;

        if (data.status === "SUBSCRIBED") {
          accountContext.textContent = `You’re subscribed to Kurioticket updates at ${accountEmail}.`;
          form.style.display = "none";
          return;
        }

        if (data.status === "UNSUBSCRIBED") {
          accountContext.textContent = `You previously unsubscribed. Resubscribe with your account email: ${accountEmail}.`;
          form.style.display = "flex";
          return;
        }

        accountContext.textContent = `Subscribe with your account email: ${accountEmail}.`;
        form.style.display = "flex";
      } catch (error) {
        console.error("[newsletter:session-bridge]", error);
      }
    }

    void refreshNewsletterStatus();

    return () => {
      cancelled = true;
      accountContext.remove();
      restoreGuestNewsletterForm(input, form);
    };
  }, [pathname, session?.user?.email, status]);

  return null;
}

function applyReactControlledInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(input, "value")?.set;
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value);
  } else if (valueSetter) {
    valueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function restoreGuestNewsletterForm(input: HTMLInputElement, form: HTMLFormElement) {
  input.required = true;
  input.removeAttribute("aria-hidden");
  input.removeAttribute("tabindex");
  input.style.display = "";
  form.style.display = "";
}
