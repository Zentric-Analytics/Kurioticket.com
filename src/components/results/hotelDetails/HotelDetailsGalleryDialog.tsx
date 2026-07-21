"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/IconButton";
import { getHotelGallerySwipeDirection } from "@/components/results/hotelGalleryPresentation";

type GalleryDialogProps = {
  activeUrl: string;
  imageAlt: string;
  title: string;
  closeLabel: string;
  previousPhotoLabel: string;
  nextPhotoLabel: string;
  photoCounter: string;
  usableIndices: number[];
  displayCandidates: string[];
  activeIndex: number;
  selectPhotoLabel: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelectImage: (imageIndex: number) => void;
  onImageError: (url: string) => void;
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HotelDetailsGalleryDialog({
  activeUrl,
  imageAlt,
  title,
  closeLabel,
  previousPhotoLabel,
  nextPhotoLabel,
  photoCounter,
  usableIndices,
  displayCandidates,
  activeIndex,
  selectPhotoLabel,
  onClose,
  onPrevious,
  onNext,
  onSelectImage,
  onImageError,
}: GalleryDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const keyboardHandlersRef = useRef({
    onClose,
    onPrevious,
    onNext,
    usableCount: usableIndices.length,
  });
  useEffect(() => {
    keyboardHandlersRef.current = {
      onClose,
      onPrevious,
      onNext,
      usableCount: usableIndices.length,
    };
  }, [onClose, onNext, onPrevious, usableIndices.length]);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousRootOverscroll = root.style.overscrollBehavior;

    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    root.style.overscrollBehavior = "none";

    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        keyboardHandlersRef.current.onClose();
        return;
      }
      if (event.key === "ArrowLeft" && keyboardHandlersRef.current.usableCount > 1) {
        event.preventDefault();
        keyboardHandlersRef.current.onPrevious();
        return;
      }
      if (event.key === "ArrowRight" && keyboardHandlersRef.current.usableCount > 1) {
        event.preventDefault();
        keyboardHandlersRef.current.onNext();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      root.style.overscrollBehavior = previousRootOverscroll;
    };
  }, []);

  useEffect(() => {
    const strip = thumbnailStripRef.current;
    const activeThumbnail = strip?.querySelector<HTMLElement>(
      `[data-gallery-index="${activeIndex}"]`,
    );
    if (!strip || !activeThumbnail) return;
    const left = activeThumbnail.offsetLeft;
    const right = left + activeThumbnail.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left });
    else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: right - strip.clientWidth });
    }
  }, [activeIndex]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex h-[100dvh] w-full items-stretch justify-center overflow-hidden bg-slate-950/90 p-[max(0.75rem,env(safe-area-inset-top))_max(0.75rem,env(safe-area-inset-right))_max(0.75rem,env(safe-area-inset-bottom))_max(0.75rem,env(safe-area-inset-left))]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 px-2 py-2 sm:px-4">
          <h2 id={titleId} className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {title}
          </h2>
          <button ref={closeButtonRef} type="button" className="focus-ring inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-navy hover:bg-surface-subtle" aria-label={closeLabel} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          className="relative min-h-0 flex-1 touch-pan-y"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse") pointerStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = pointerStartRef.current;
            pointerStartRef.current = null;
            if (!start || usableIndices.length < 2) return;
            const direction = getHotelGallerySwipeDirection(start, { x: event.clientX, y: event.clientY });
            if (direction === -1) onPrevious();
            if (direction === 1) onNext();
          }}
          onPointerCancel={() => { pointerStartRef.current = null; }}
        >
          <Image key={activeUrl} src={activeUrl} alt={imageAlt} fill className="select-none object-contain" sizes="100vw" onError={() => onImageError(activeUrl)} priority />
          {usableIndices.length > 1 ? (
            <>
              <IconButton variant="secondary" size="lg" className="absolute left-1 top-1/2 -translate-y-1/2 shadow-lg sm:left-4" aria-label={previousPhotoLabel} onClick={onPrevious}>
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </IconButton>
              <IconButton variant="secondary" size="lg" className="absolute right-1 top-1/2 -translate-y-1/2 shadow-lg sm:right-4" aria-label={nextPhotoLabel} onClick={onNext}>
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </IconButton>
            </>
          ) : null}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold">{photoCounter}</div>
        </div>

        {usableIndices.length > 1 ? (
          <div ref={thumbnailStripRef} className="flex w-full shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-2 py-3 sm:px-4">
            {usableIndices.map((imageIndex, visibleIndex) => {
              const url = displayCandidates[imageIndex];
              return (
                <button key={url} type="button" data-gallery-index={imageIndex} aria-pressed={activeIndex === imageIndex} aria-label={selectPhotoLabel.replace("{{number}}", String(visibleIndex + 1))} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeIndex === imageIndex ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950" : "ring-1 ring-white/40"}`} onClick={() => onSelectImage(imageIndex)}>
                  <Image src={url} alt="" fill className="object-cover" sizes="96px" onError={() => onImageError(url)} />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
