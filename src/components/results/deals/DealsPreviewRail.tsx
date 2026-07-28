import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type VisibleRailProps = {
  ariaLabel: string;
  ariaHidden?: false;
  children: ReactNode;
};

type HiddenRailProps = {
  ariaHidden: true;
  ariaLabel?: never;
  children: ReactNode;
};

type DealsPreviewRailProps = VisibleRailProps | HiddenRailProps;

export function DealsPreviewRail({ ariaLabel, ariaHidden = false, children }: DealsPreviewRailProps) {
  const itemCount = Children.count(children);

  return (
    <div
      role={ariaHidden ? undefined : "list"}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-hidden={ariaHidden || undefined}
      className={cn(
        "mt-5 grid w-full min-w-0 max-w-full grid-flow-col gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-1 sm:overflow-visible sm:overscroll-x-auto sm:snap-none sm:pb-0 md:grid-cols-2 xl:grid-cols-3",
        itemCount > 1
          ? "auto-cols-[minmax(0,calc(100%-1.5rem))]"
          : "auto-cols-[minmax(0,100%)]",
      )}
    >
      {Children.map(children, (child) => (
        <div role={ariaHidden ? undefined : "listitem"} className="h-full min-w-0 snap-start sm:snap-none">
          {child}
        </div>
      ))}
    </div>
  );
}
