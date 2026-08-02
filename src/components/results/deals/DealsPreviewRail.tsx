import { Children, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type VisibleDealsPreviewRailProps = {
  ariaLabel: string;
  ariaHidden?: false;
  children: ReactNode;
};

type HiddenDealsPreviewRailProps = {
  ariaHidden: true;
  ariaLabel?: never;
  children: ReactNode;
};

type DealsPreviewRailProps =
  | VisibleDealsPreviewRailProps
  | HiddenDealsPreviewRailProps;

export function DealsPreviewRail(props: DealsPreviewRailProps) {
  const { children } = props;
  const isHidden = props.ariaHidden === true;
  const hasMultipleChildren = Children.count(children) > 1;

  return (
    <div
      {...(isHidden
        ? { "aria-hidden": true }
        : { role: "list", "aria-label": props.ariaLabel })}
      className={cn(
        "mt-5 grid w-full min-w-0 max-w-full grid-flow-col items-start gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto",
        "sm:grid-flow-row sm:auto-cols-auto sm:items-stretch sm:grid-cols-1 sm:overflow-visible sm:overscroll-x-auto sm:snap-none sm:scroll-auto sm:px-0 sm:pb-0 sm:pt-0 md:grid-cols-2 xl:grid-cols-3",
        hasMultipleChildren
          ? "auto-cols-[minmax(17rem,calc(100vw-4.5rem))]"
          : "auto-cols-[minmax(0,100%)]",
      )}
    >
      {Children.map(children, (child) => (
        <div
          {...(isHidden ? {} : { role: "listitem" })}
          className="h-auto min-w-0 self-start snap-start snap-always sm:h-full sm:self-stretch sm:snap-none"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
