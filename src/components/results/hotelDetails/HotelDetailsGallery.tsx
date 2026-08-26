"use client";

import Image from "next/image";
import { Building2, ChevronLeft, ChevronRight, Images } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Card } from "@/components/ui/Card";
import { getHotelGallerySwipeDirection } from "@/components/results/hotelGalleryPresentation";
import { HotelDetailsGalleryDialog } from "@/components/results/hotelDetails/HotelDetailsGalleryDialog";

type HotelDetailsGalleryProps = {
  embedded?: boolean;
  layout?: "hero" | "mosaic";
  remainingPhotosLabel?: string;
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
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function HotelDetailsGallery({
  embedded = false,
  layout = "hero",
  remainingPhotosLabel = "+{{count}} photos",
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
    const thumbnail = strip?.querySelector<HTMLElement>(
      `[data-gallery-index="${activeIndex}"]`,
    );
    if (!strip || !thumbnail) return;
    const left = thumbnail.offsetLeft;
    const right = left + thumbnail.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left });
    else if (right > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: right - strip.clientWidth });
  }, [activeIndex]);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    if (restoreFocusFrameRef.current !== null)
      window.cancelAnimationFrame(restoreFocusFrameRef.current);
    restoreFocusFrameRef.current = window.requestAnimationFrame(() => {
      openerRef.current?.focus();
      restoreFocusFrameRef.current = null;
    });
  }, []);

  useEffect(
    () => () => {
      if (restoreFocusFrameRef.current !== null)
        window.cancelAnimationFrame(restoreFocusFrameRef.current);
    },
    [],
  );

  function openViewer(opener: HTMLElement) {
    if (!activeUrl) return;
    openerRef.current = opener;
    setViewerOpen(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || usableIndices.length < 2) return;
    const direction = getHotelGallerySwipeDirection(start, {
      x: event.clientX,
      y: event.clientY,
    });
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

  const visibleIndices = usableIndices.slice(0, 4);
  const remainingPhotoCount = Math.max(
    usableIndices.length - visibleIndices.length,
    0,
  );

  const mosaic = (
    <div
      className="hidden h-[300px] min-w-0 grid-cols-[1.42fr_1fr] grid-rows-2 gap-2 overflow-hidden lg:grid"
      data-hotel-gallery-mosaic
    >
      {visibleIndices.map((imageIndex, tileIndex) => {
        const url = displayCandidates[imageIndex];
        const tileLabel = openPhotoViewerLabel
          .replace("{{current}}", String(tileIndex + 1))
          .replace("{{total}}", String(usableIndices.length))
          .replace("{{hotelName}}", hotelName);
        return (
          <button
            key={url}
            type="button"
            className={`group relative min-h-0 overflow-hidden rounded-[10px] bg-slate-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-blue ${
              tileIndex === 0
                ? "lg:row-span-2"
                : tileIndex === 1
                  ? "hidden lg:block"
                  : tileIndex === 2
                    ? "hidden lg:block lg:col-start-2 lg:row-start-2 lg:me-[calc(50%+4px)]"
                    : "hidden lg:block lg:col-start-2 lg:row-start-2 lg:ms-[calc(50%+4px)]"
            }`}
            aria-label={tileLabel}
            onClick={(event) => {
              onSelectImage(imageIndex);
              openViewer(event.currentTarget);
            }}
          >
            <Image
              src={url}
              alt={tileIndex === 0 ? imageAlt : ""}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              sizes={
                tileIndex === 0 ? "(min-width: 1024px) 520px, 100vw" : "340px"
              }
              onError={() => onImageError(url)}
              priority={tileIndex < 2}
            />
            {tileIndex === 3 && remainingPhotoCount > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/30 text-sm font-bold text-white">
                {remainingPhotosLabel.replace(
                  "{{count}}",
                  String(remainingPhotoCount),
                )}
              </span>
            ) : null}
          </button>
        );
      })}
      {!visibleIndices.length ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[10px] bg-surface-subtle px-6 text-center lg:col-span-2 lg:row-span-2">
          <Building2 className="h-11 w-11 text-blue" aria-hidden="true" />
          <span className="max-w-xs text-sm font-semibold text-slate-600">
            {imageUnavailableText}
          </span>
        </div>
      ) : null}
    </div>
  );

  const mobileThumbnailIndices = usableIndices.slice(0, 5);
  const mobileRemainingCount = Math.max(usableIndices.length - 5, 0);

  const hero = (
    <div
      className="relative aspect-[16/10] min-h-[190px] max-h-[420px] w-full overflow-hidden rounded-[11px] bg-slate-100 lg:rounded-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse")
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartRef.current = null;
      }}
    >
      {activeUrl ? (
        <button
          type="button"
          className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-blue"
          aria-label={openLabel}
          onClick={(event) => openViewer(event.currentTarget)}
        >
          <Image
            key={activeUrl}
            src={activeUrl}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 680px, 100vw"
            onError={() => onImageError(activeUrl)}
            preload
          />
        </button>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-subtle px-6 text-center">
          <Building2 className="h-11 w-11 text-blue" aria-hidden="true" />
          <span className="max-w-xs text-sm font-semibold text-slate-600">
            {imageUnavailableText}
          </span>
        </div>
      )}
      {showGalleryControls ? (
        <>
          <button
            type="button"
            aria-label={previousPhotoLabel}
            onClick={onPrevious}
            className="focus-ring absolute left-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.8)]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={nextPhotoLabel}
            onClick={onNext}
            className="focus-ring absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.8)]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white">
            {activePosition} / {usableIndices.length}
          </div>
        </>
      ) : null}
    </div>
  );

  const mobileThumbnails = showGalleryControls ? (
    <div
      ref={thumbnailStripRef}
      className="mt-2 grid grid-cols-5 gap-1.5 lg:hidden"
      data-hotel-mobile-thumbnail-strip
    >
      {mobileThumbnailIndices.map((imageIndex, visibleIndex) => {
        const thumbnailUrl = displayCandidates[imageIndex];
        const isRemainingTile = visibleIndex === 4 && mobileRemainingCount > 0;
        return (
          <button
            key={thumbnailUrl}
            type="button"
            data-gallery-index={imageIndex}
            aria-pressed={activeIndex === imageIndex}
            aria-label={
              isRemainingTile
                ? viewAllPhotosLabel
                : selectPhotoLabel.replace(
                    "{{number}}",
                    String(visibleIndex + 1),
                  )
            }
            className={`relative aspect-[4/3] min-w-0 overflow-hidden rounded-md bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${activeIndex === imageIndex ? "ring-2 ring-blue" : "ring-1 ring-slate-200"}`}
            onClick={(event) => {
              onSelectImage(imageIndex);
              if (isRemainingTile) openViewer(event.currentTarget);
            }}
          >
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="20vw"
              onError={() => onImageError(thumbnailUrl)}
            />
            {isRemainingTile ? (
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-bold text-white">
                <Images className="mr-1 h-4 w-4" aria-hidden="true" />+
                {mobileRemainingCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  ) : null;

  const content = (
    <>
      {layout === "mosaic" ? (
        <>
          <div className="mx-3 lg:hidden" data-hotel-mobile-gallery-unit>
            {hero}
            {mobileThumbnails}
          </div>
          {mosaic}
        </>
      ) : (
        hero
      )}

      {layout === "hero" && showGalleryControls ? (
        <div
          ref={thumbnailStripRef}
          className="flex w-full max-w-full gap-2.5 overflow-x-auto overscroll-x-contain border-t border-border bg-surface-subtle/50 p-3"
        >
          {usableIndices.map((imageIndex, visibleIndex) => {
            const thumbnailUrl = displayCandidates[imageIndex];
            return (
              <button
                key={thumbnailUrl}
                type="button"
                data-gallery-index={imageIndex}
                aria-pressed={activeIndex === imageIndex}
                aria-label={selectPhotoLabel.replace(
                  "{{number}}",
                  String(visibleIndex + 1),
                )}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${activeIndex === imageIndex ? "ring-2 ring-blue ring-offset-2 ring-offset-surface-subtle" : "ring-1 ring-border hover:ring-border-strong"}`}
                onClick={() => onSelectImage(imageIndex)}
              >
                <Image
                  src={thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                  onError={() => onImageError(thumbnailUrl)}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {activeIndex >= 0 ? photoPositionAnnouncement : ""}
      </span>

      {viewerOpen && activeUrl ? (
        <HotelDetailsGalleryDialog
          activeUrl={activeUrl}
          imageAlt={imageAlt}
          title={photoViewerTitle}
          closeLabel={closePhotoViewerLabel}
          previousPhotoLabel={previousPhotoLabel}
          nextPhotoLabel={nextPhotoLabel}
          photoCounter={photoCounter}
          usableIndices={usableIndices}
          displayCandidates={displayCandidates}
          activeIndex={activeIndex}
          selectPhotoLabel={selectPhotoLabel}
          onClose={closeViewer}
          onPrevious={onPrevious}
          onNext={onNext}
          onSelectImage={onSelectImage}
          onImageError={(url) => {
            onImageError(url);
            if (usableIndices.length === 1) closeViewer();
          }}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="min-w-0" onKeyDown={handleGalleryKeyDown}>
        {content}
      </div>
    );
  }

  return (
    <Card
      variant="flat"
      className="min-w-0 overflow-hidden p-0 shadow-[0_12px_32px_-26px_rgba(2,28,43,0.32)]"
      onKeyDown={handleGalleryKeyDown}
    >
      {content}
    </Card>
  );
}
