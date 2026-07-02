import type { ReactNode } from "react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { cn } from "@/lib/utils";

type BrandedLoadingProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  variant?: "fullscreen" | "page" | "compact";
  className?: string;
  contentClassName?: string;
  showLogo?: boolean;
};

const variantClasses = {
  fullscreen:
    "min-h-screen items-center justify-center px-6 py-12 text-center",
  page: "py-6 text-left sm:py-8",
  compact: "py-4 text-left",
} satisfies Record<NonNullable<BrandedLoadingProps["variant"]>, string>;

export function BrandedLoading({
  title = "Loading Kurioticket...",
  description = "Preparing your experience...",
  children,
  variant = "page",
  className,
  contentClassName,
  showLogo = true,
}: BrandedLoadingProps) {
  const isFullscreen = variant === "fullscreen";

  return (
    <section
      className={cn(
        "relative flex overflow-hidden bg-[linear-gradient(135deg,rgba(0,75,184,0.08),rgba(92,182,178,0.12)_45%,rgba(255,255,255,0.96))] text-[#021C2B]",
        variantClasses[variant],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
        <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-[#5CB6B2]/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-[#004BB8]/15 blur-3xl" />
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
            <KurioticketLogo className="h-10 sm:h-11" />
          </div>
        ) : null}

        <div className={cn(showLogo ? "mt-7" : undefined)}>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#004BB8]/10">
            <div className="h-full w-1/2 animate-[loading-line_1.4s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,#004BB8,#5CB6B2)] motion-reduce:animate-none" />
          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-[#021C2B] sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[#021C2B]/70 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#004BB8] motion-reduce:animate-none" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#5CB6B2] delay-150 motion-reduce:animate-none" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#021C2B] delay-300 motion-reduce:animate-none" />
        </div>

        {children ? <div className="mt-6 w-full">{children}</div> : null}
      </div>
    </section>
  );
}
