import { cn } from "@/lib/utils";

type KurioticketLogoProps = {
  variant?: "full" | "mark";
  tone?: "light" | "dark";
  className?: string;
  markClassName?: string;
  textClassName?: string;
  "aria-label"?: string;
};

const RawImage = "img";

export function KurioticketLogo({
  variant = "full",
  className,
  markClassName,
  textClassName,
  "aria-label": ariaLabel,
}: KurioticketLogoProps) {
  const label = ariaLabel ?? "Kurioticket";
  const markOnly = variant === "mark";
  const source = markOnly
    ? "/brand/kurioticket-icon-blue.svg"
    : "/brand/kurioticket-logo-primary-light-bg.svg";

  if (markOnly) {
    return (
      <RawImage
        src={source}
        alt={label}
        className={cn("h-11 w-11 shrink-0", markClassName, className)}
      />
    );
  }

  return (
    <RawImage
      src={source}
      alt={label}
      className={cn("h-9 w-auto shrink-0", className, textClassName)}
    />
  );
}
