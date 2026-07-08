import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type MessageBannerTone = "error" | "success" | "info";

type MessageBannerProps = HTMLAttributes<HTMLDivElement> & {
  tone?: MessageBannerTone;
  children: ReactNode;
};

const toneClasses: Record<MessageBannerTone, string> = {
  error: "border-error-border bg-error-surface text-error-text",
  success: "border-success-border bg-success-surface text-success-text",
  info: "border-status-border bg-status-surface text-status-text",
};

export function MessageBanner({
  tone = "info",
  className,
  children,
  role,
  "aria-live": ariaLive,
  ...props
}: MessageBannerProps) {
  const liveRegion = ariaLive ?? (tone === "error" ? "polite" : undefined);

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 text-sm font-semibold leading-5",
        toneClasses[tone],
        className,
      )}
      role={role ?? (tone === "error" ? "alert" : "status")}
      aria-live={liveRegion}
      {...props}
    >
      {children}
    </div>
  );
}
