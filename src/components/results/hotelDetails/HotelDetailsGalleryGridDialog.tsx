"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type GalleryGridDialogProps = {
  hotelName: string;
  closeLabel: string;
  selectPhotoLabel: string;
  usableIndices: number[];
  displayCandidates: string[];
  activeIndex: number;
  getInitialScrollTop: () => number;
  onScrollTopChange: (scrollTop: number) => void;
  onClose: () => void;
  onSelectImage: (imageIndex: number) => void;
  onImageError: (url: string) => void;
};

const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HotelDetailsGalleryGridDialog({
  hotelName,
  closeLabel,
  selectPhotoLabel,
  usableIndices,
  displayCandidates,
  activeIndex,
  getInitialScrollTop,
  onScrollTopChange,
  onClose,
  onSelectImage,
  onImageError,
}: GalleryGridDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    if (scrollRef.current) scrollRef.current.scrollTop = getInitialScrollTop();
    const frame = window.requestAnimationFrame(() => {
      const selected = dialogRef.current?.querySelector<HTMLElement>(
        "[data-gallery-grid-selected]",
      );
      (selected ?? backButtonRef.current)?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
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
    };
  }, [getInitialScrollTop, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex h-[100dvh] items-center justify-center bg-[#101b27]/70 p-3 sm:p-12" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-[#192024] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-center gap-4 border-b border-[#e5e9ed] px-5 py-4 sm:px-8">
          <button ref={backButtonRef} type="button" aria-label={closeLabel} onClick={onClose} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#192024] transition-colors hover:bg-[#f1f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0757b8]">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <h2 id={titleId} className="truncate text-lg font-semibold">{hotelName}</h2>
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}>
          <div className="grid grid-cols-1 gap-3 px-3 pb-10 pt-7 sm:grid-cols-2 sm:gap-4">
            {usableIndices.map((imageIndex, visibleIndex) => {
              const url = displayCandidates[imageIndex];
              return (
                <button key={`${imageIndex}-${url}`} type="button" data-gallery-grid-index={imageIndex} data-gallery-grid-selected={activeIndex === imageIndex ? "" : undefined} aria-label={selectPhotoLabel.replace("{{number}}", String(visibleIndex + 1))} className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg bg-[#f1f4f6] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0757b8] sm:aspect-[1.9/1]" onClick={() => onSelectImage(imageIndex)}>
                  <Image src={url} alt="" fill className="object-cover transition-transform duration-200 group-hover:scale-[1.015]" sizes="(min-width: 640px) 46vw, 90vw" onError={() => onImageError(url)} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
