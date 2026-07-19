"use client";

import Image from "next/image";
import { Building2, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { getHotelGallerySwipeDirection } from "@/components/results/hotelGalleryPresentation";
import { HotelDetailsGalleryDialog } from "@/components/results/hotelDetails/HotelDetailsGalleryDialog";

type HotelDetailsGalleryProps = {
  activeUrl: string;
  imageAlt: string;
  hotelName: string;
  imageUnavailableText: string;
  showGalleryControls: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousPhotoLabel: string;
  nextPhotoLabel: string;
  photoCounter: string;
  photoPositionAnnouncement: string;
  usableIndices: number[];
  displayCandidates: string[];
  activeIndex: number;
  activePosition: number;
  selectPhotoLabel: string;
  viewAllPhotosLabel: string;
  openPhotoViewerLabel: string;
  closePhotoViewerLabel: string;
  photoViewerTitle: string;
  onSelectImage: (imageIndex: number) => void;
  onImageError: (url: string) => void;
};

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function HotelDetailsGallery({
  activeUrl,
  imageAlt,
  hotelName,
  imageUnavailableText,
  showGalleryControls,
  onPrevious,
  onNext,
  previousPhotoLabel,
  nextPhotoLabel,
  photoCounter,
  photoPositionAnnouncement,
  usableIndices,
  displayCandidates,
  activeIndex,
  activePosition,
  selectPhotoLabel,
  viewAllPhotosLabel,
  openPhotoViewerLabel,
  closePhotoViewerLabel,
  photoViewerTitle,
  onSelectImage,
  onImageError,
}: HotelDetailsGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const restoreFocusFrameRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = thumbnailStripRef.current;
    const thumbnail = strip?.querySelector<HTMLElement>(`[data-gallery-index="${activeIndex}"]`);
    if (!strip || !thumbnail) return;
    const left = thumbnail.offsetLeft;
    const right = left + thumbnail.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left });
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth });
  }, [activeIndex]);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    if (restoreFocusFrameRef.current !== null) window.cancelAnimationFrame(restoreFocusFrameRef.current);
    restoreFocusFrameRef.current = window.requestAnimationFrame(() => {
      openerRef.current?.focus();
      restoreFocusFrameRef.current = null;
    });
  }, []);

  useEffect(() => () => {
    if (restoreFocusFrameRef.current !== null) window.cancelAnimationFrame(restoreFocusFrameRef.current);
  }, []);

  function openViewer(opener: HTMLElement) {
    if (!activeUrl) return;
    openerRef.current = opener;
    setViewerOpen(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || usableIndices.length < 2) return;
    const direction = getHotelGallerySwipeDirection(start, { x: event.clientX, y: event.clientY });
    if (direction === -1) onPrevious();
    if (direction === 1) onNext();
  }

  function handleGalleryKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!showGalleryControls || isEditableTarget(event.target)) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
    }
  }

  const openLabel = openPhotoViewerLabel
    .replace("{{current}}", String(activePosition))
    .replace("{{total}}", String(usableIndices.length))
    .replace("{{hotelName}}", hotelName);

  return (
    <Card variant="flat" className="min-w-0 overflow-hidden p-0 lg:col-start-1 lg:row-start-2" onKeyDown={handleGalleryKeyDown}>
      <div
        className="relative aspect-[4/3] max-h-[420px] min-h-[240px] overflow-hidden bg-slate-100 sm:aspect-[16/10] sm:min-h-0"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") pointerStartRef.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStartRef.current = null; }}
      >
        {activeUrl ? (
          <button type="button" className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-blue" aria-label={openLabel} onClick={(event) => openViewer(event.currentTarget)}>
            <Image key={activeUrl} src={activeUrl} alt={imageAlt} fill className="object-cover" sizes="(min-width: 1024px) 680px, 100vw" onError={() => onImageError(activeUrl)} priority />
          </button>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue/10 via-surface to-surface-subtle px-6 text-center">
            <Building2 className="h-11 w-11 text-blue" aria-hidden="true" />
            <span className="max-w-xs text-sm font-semibold text-slate-600">{imageUnavailableText}</span>
          </div>
        )}

        {showGalleryControls ? (
          <>
            <IconButton variant="primary" size="lg" className="absolute left-2 top-1/2 -translate-y-1/2 shadow-md sm:left-3" aria-label={previousPhotoLabel} onClick={onPrevious}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            <IconButton variant="primary" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2 shadow-md sm:right-3" aria-label={nextPhotoLabel} onClick={onNext}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">{photoCounter}</div>
            <button type="button" className="focus-ring absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface/95 px-3 text-xs font-semibold text-navy shadow-md hover:bg-surface" onClick={(event) => openViewer(event.currentTarget)}>
              <Images className="h-4 w-4" aria-hidden="true" />
              {viewAllPhotosLabel}
            </button>
          </>
        ) : null}
      </div>

      {showGalleryControls ? (
        <div ref={thumbnailStripRef} className="flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain p-3">
          {usableIndices.map((imageIndex, visibleIndex) => {
            const thumbnailUrl = displayCandidates[imageIndex];
            return (
              <button key={thumbnailUrl} type="button" data-gallery-index={imageIndex} aria-pressed={activeIndex === imageIndex} aria-label={selectPhotoLabel.replace("{{number}}", String(visibleIndex + 1))} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${activeIndex === imageIndex ? "ring-2 ring-blue ring-offset-2" : "ring-1 ring-slate-200"}`} onClick={() => onSelectImage(imageIndex)}>
                <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="96px" onError={() => onImageError(thumbnailUrl)} />
              </button>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite" aria-atomic="true">{activeIndex >= 0 ? photoPositionAnnouncement : ""}</span>

      {viewerOpen && activeUrl ? (
        <HotelDetailsGalleryDialog activeUrl={activeUrl} imageAlt={imageAlt} title={photoViewerTitle} closeLabel={closePhotoViewerLabel} previousPhotoLabel={previousPhotoLabel} nextPhotoLabel={nextPhotoLabel} photoCounter={photoCounter} usableIndices={usableIndices} displayCandidates={displayCandidates} activeIndex={activeIndex} selectPhotoLabel={selectPhotoLabel} onClose={closeViewer} onPrevious={onPrevious} onNext={onNext} onSelectImage={onSelectImage} onImageError={(url) => { onImageError(url); if (usableIndices.length === 1) closeViewer(); }} />
      ) : null}
    </Card>
  );
}
