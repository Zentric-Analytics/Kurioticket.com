import { useId } from "react";

import { cn } from "@/lib/utils";

type KurioticketLogoProps = {
  variant?: "full" | "mark";
  tone?: "light" | "dark";
  className?: string;
  markClassName?: string;
  textClassName?: string;
  "aria-label"?: string;
};

export function KurioticketLogo({
  variant = "full",
  tone = "dark",
  className,
  markClassName,
  textClassName,
  "aria-label": ariaLabel,
}: KurioticketLogoProps) {
  const rawGradientId = useId();
  const rawMaskId = useId();
  const gradientId = `kurioticket-gradient-${rawGradientId.replace(/:/g, "")}`;
  const maskId = `kurioticket-mask-${rawMaskId.replace(/:/g, "")}`;
  const label = ariaLabel ?? "Kurioticket";
  const markOnly = variant === "mark";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 leading-none",
        markOnly && "gap-0",
        className
      )}
    >
      <svg
        viewBox="0 0 48 48"
        className={cn("h-11 w-11 shrink-0", markClassName)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={markOnly ? undefined : "true"}
        aria-label={markOnly ? label : undefined}
        role={markOnly ? "img" : undefined}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="7"
            y1="8"
            x2="41"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4F46E5" />
            <stop offset="0.52" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>

          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="5"
            y="8"
            width="38"
            height="32"
          >
            <rect x="5" y="8" width="38" height="32" rx="9" fill="white" />
            <circle cx="5" cy="24" r="4.5" fill="black" />
            <circle cx="43" cy="24" r="4.5" fill="black" />
          </mask>
        </defs>

        <rect
          x="5"
          y="8"
          width="38"
          height="32"
          rx="9"
          fill={`url(#${gradientId})`}
          mask={`url(#${maskId})`}
        />
        <path
          d="M13.5 28.5C18 20.5 25.2 19.8 30.8 24.9C32.7 26.6 34.8 26.1 36.5 23.4"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.96"
        />
        <circle cx="14" cy="28.2" r="2" fill="white" opacity="0.96" />
        <circle cx="36.6" cy="23.2" r="2" fill="white" opacity="0.96" />
        <path
          d="M30.6 14.3L31.9 17.1L34.8 18.3L31.9 19.6L30.6 22.4L29.4 19.6L26.5 18.3L29.4 17.1L30.6 14.3Z"
          fill="white"
        />
        <path
          d="M19 14H23"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M18 34H26"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.32"
        />
      </svg>

      {variant === "full" ? (
        <span
          className={cn(
            "text-xl font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-slate-950",
            textClassName
          )}
        >
          Kurioticket
        </span>
      ) : null}
    </span>
  );
}
