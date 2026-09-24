import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

function createTransmissionIcon(kind: "automatic" | "manual"): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function TransmissionIcon(
    {
      color = "currentColor",
      size = 24,
      strokeWidth = 1.7,
      absoluteStrokeWidth = false,
      ...props
    },
    ref,
  ) {
    const resolvedStrokeWidth =
      absoluteStrokeWidth && typeof size === "number"
        ? (Number(strokeWidth) * 24) / size
        : strokeWidth;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={resolvedStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {kind === "automatic" ? (
          <>
            <path d="M7 4.5h5.5v15H7zM9.75 6.5v10" />
            <circle cx="9.75" cy="14.5" r="1.25" fill={color} stroke="none" />
            <text x="15" y="7" fill={color} stroke="none" fontSize="4.2" fontWeight="600">P</text>
            <text x="15" y="11.2" fill={color} stroke="none" fontSize="4.2" fontWeight="600">R</text>
            <text x="15" y="15.4" fill={color} stroke="none" fontSize="4.2" fontWeight="600">N</text>
            <text x="15" y="19.6" fill={color} stroke="none" fontSize="4.2" fontWeight="600">D</text>
          </>
        ) : (
          <>
            <path d="M6 8v8M12 8v8M18 8v8M6 12h12" />
            <circle cx="6" cy="12" r="1" fill={color} stroke="none" />
            <text x="4.6" y="6.5" fill={color} stroke="none" fontSize="4.2" fontWeight="600">R</text>
            <text x="10.8" y="6.5" fill={color} stroke="none" fontSize="4.2" fontWeight="600">1</text>
            <text x="16.8" y="6.5" fill={color} stroke="none" fontSize="4.2" fontWeight="600">3</text>
            <text x="10.8" y="21" fill={color} stroke="none" fontSize="4.2" fontWeight="600">2</text>
            <text x="16.8" y="21" fill={color} stroke="none" fontSize="4.2" fontWeight="600">4</text>
          </>
        )}
      </svg>
    );
  });

  Icon.displayName =
    kind === "automatic"
      ? "AutomaticTransmissionIcon"
      : "ManualTransmissionIcon";

  return Icon as LucideIcon;
}

export const AutomaticTransmissionIcon = createTransmissionIcon("automatic");
export const ManualTransmissionIcon = createTransmissionIcon("manual");
