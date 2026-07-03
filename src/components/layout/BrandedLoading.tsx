"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { cn } from "@/lib/utils";

type BrandedLoadingProps = {
  title?: string;
  description?: string;
  messages?: string[];
  searchType?: "flight" | "hotel" | "car" | "deals" | "travel";
  children?: ReactNode;
  variant?: "fullscreen" | "page" | "compact";
  className?: string;
  contentClassName?: string;
  showLogo?: boolean;
  showProgress?: boolean;
  visual?: "default" | "logoPulse";
};

const searchLoadingCopy = {
  flight: {
    title: "Searching the best flights for you",
    messages: [
      "Checking airlines and fares...",
      "Comparing routes and providers...",
      "Finding the best available options...",
      "Preparing your results...",
    ],
  },
  hotel: {
    title: "Finding the best stays for you",
    messages: [
      "Checking availability and rates...",
      "Comparing hotels and room options...",
      "Preparing your stays...",
    ],
  },
  car: {
    title: "Looking for the best car rental options",
    messages: [
      "Checking vehicles, prices, and pickup options...",
      "Comparing rental providers...",
      "Preparing your car options...",
    ],
  },
  deals: {
    title: "Finding the best travel deals for you",
    messages: [
      "Checking current offers...",
      "Comparing available options...",
      "Preparing your deals...",
    ],
  },
  travel: {
    title: "Finding the best travel options for you",
    messages: [
      "Checking providers...",
      "Comparing available options...",
      "Preparing your results...",
    ],
  },
} satisfies Record<NonNullable<BrandedLoadingProps["searchType"]>, { title: string; messages: string[] }>;

const variantClasses = {
  fullscreen:
    "min-h-screen items-center justify-center px-6 py-12 text-center",
  page: "py-6 text-left sm:py-8",
  compact: "py-4 text-left",
} satisfies Record<NonNullable<BrandedLoadingProps["variant"]>, string>;

export function BrandedLoading({
  title,
  description,
  messages,
  searchType,
  children,
  variant = "page",
  className,
  contentClassName,
  showLogo = true,
  showProgress = true,
  visual = "default",
}: BrandedLoadingProps) {
  const isFullscreen = variant === "fullscreen";
  const logoPulse = visual === "logoPulse";
  const searchCopy = searchType ? searchLoadingCopy[searchType] : undefined;
  const loadingMessages = useMemo(
    () => messages ?? (description ? [description] : searchCopy?.messages) ?? ["Preparing your experience..."],
    [description, messages, searchCopy?.messages],
  );
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (loadingMessages.length <= 1) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [loadingMessages.length]);

  const resolvedTitle = title ?? searchCopy?.title ?? "Loading Kurioticket...";
  const resolvedDescription = loadingMessages[messageIndex % loadingMessages.length];

  return (
    <section
      className={cn(
        "relative flex overflow-hidden bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] text-[#021C2B]",
        variantClasses[variant],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-20 top-12 h-44 w-44 rounded-full bg-[#5CB6B2]/[0.06] blur-3xl" />
        <div className="absolute -right-24 bottom-4 h-52 w-52 rounded-full bg-[#004BB8]/[0.05] blur-3xl" />
      </div>

      <div
        className={cn(
          "relative z-10 w-full max-w-xl",
          isFullscreen && "mx-auto flex flex-col items-center",
          contentClassName,
        )}
      >
        {showLogo ? (
          <div className={cn("flex", isFullscreen ? "justify-center" : "justify-start")}>
            <div
              className={cn(
                logoPulse &&
                  "kurioticket-logo-pulse relative isolate motion-reduce:animate-none",
              )}
            >
              <KurioticketLogo
                className={cn(
                  "h-10 sm:h-11",
                  logoPulse && "drop-shadow-[0_8px_18px_rgba(0,75,184,0.08)] animate-[logo-breathe_2.8s_ease-in-out_infinite] motion-reduce:animate-none",
                )}
              />
            </div>
          </div>
        ) : null}

        <div className={cn(showLogo ? "mt-7" : undefined)}>
          {showProgress ? (
            <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-[#004BB8]/[0.08]">
              <div className="h-full w-1/2 animate-[loading-line_1.4s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,rgba(0,75,184,0.82),rgba(92,182,178,0.78))] motion-reduce:animate-none" />
            </div>
          ) : null}

          <h1 className={cn("text-xl font-semibold tracking-tight text-[#021C2B] sm:text-2xl", showProgress ? "mt-5" : "mt-0")}>
            {resolvedTitle}
          </h1>
          {resolvedDescription ? (
            <p className="mt-2 text-sm leading-6 text-[#021C2B]/70 sm:text-base">
              {resolvedDescription}
            </p>
          ) : null}
        </div>

        {showProgress ? (
          <div className="mt-5 flex gap-2" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#004BB8]/80 motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5CB6B2]/80 delay-150 motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#021C2B]/55 delay-300 motion-reduce:animate-none" />
          </div>
        ) : null}

        {children ? <div className="mt-6 w-full">{children}</div> : null}
      </div>
    </section>
  );
}
