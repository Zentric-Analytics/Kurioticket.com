import { cn } from "@/lib/utils";

type DealsOpenLineSide = "left" | "right";
type DealsOpenLineTurn = "top" | "bottom";

type DealsOpenSectionLineProps = {
  side: DealsOpenLineSide;
  turn: DealsOpenLineTurn;
  className?: string;
};

export function DealsOpenSectionLine({
  side,
  turn,
  className,
}: DealsOpenSectionLineProps) {
  const originClasses = {
    "left-top": "start-0 top-0 border-s border-t rounded-ss-2xl",
    "left-bottom": "start-0 bottom-0 border-s border-b rounded-es-2xl",
    "right-top": "end-0 top-0 border-e border-t rounded-se-2xl",
    "right-bottom": "end-0 bottom-0 border-e border-b rounded-ee-2xl",
  }[`${side}-${turn}`];

  return (
    <div
      className={cn(
        "pointer-events-none relative h-5 select-none overflow-visible",
        className,
      )}
      aria-hidden="true"
    >
      <span
        className={`absolute h-5 w-[calc(100%-2rem)] border-slate-300/80 sm:w-[calc(100%-2.5rem)] ${originClasses}`}
      />
    </div>
  );
}
