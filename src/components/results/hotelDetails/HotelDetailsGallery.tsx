import Image from "next/image";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";

export function HotelDetailsGallery({ activeUrl, imageAlt, imageUnavailableText, showGalleryControls, onPrevious, onNext, previousPhotoLabel, nextPhotoLabel, photoCounter, usableIndices, displayCandidates, activeIndex, selectPhotoLabel, onSelectImage, onImageError }: {
  activeUrl: string;
  imageAlt: string;
  imageUnavailableText: string;
  showGalleryControls: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousPhotoLabel: string;
  nextPhotoLabel: string;
  photoCounter: string;
  usableIndices: number[];
  displayCandidates: string[];
  activeIndex: number;
  selectPhotoLabel: string;
  onSelectImage: (imageIndex: number) => void;
  onImageError: (url: string) => void;
}) {
  return (
    <Card variant="flat" className="overflow-hidden p-0 lg:col-start-1 lg:row-start-2">
      <div className="relative h-[260px] bg-slate-100 sm:h-[420px]">
        {activeUrl ? <Image src={activeUrl} alt={imageAlt} fill className="object-cover" sizes="(min-width: 1024px) 680px, 100vw" onError={() => onImageError(activeUrl)} priority /> : <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue/10 via-surface to-surface-subtle px-6 text-center"><Building2 className="h-11 w-11 text-blue" aria-hidden="true" /><span className="max-w-xs text-sm font-semibold text-slate-600">{imageUnavailableText}</span></div>}
        {showGalleryControls ? <><IconButton variant="primary" size="md" className="absolute left-3 top-1/2 -translate-y-1/2 shadow-md" aria-label={previousPhotoLabel} onClick={onPrevious}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></IconButton><IconButton variant="primary" size="md" className="absolute right-3 top-1/2 -translate-y-1/2 shadow-md" aria-label={nextPhotoLabel} onClick={onNext}><ChevronRight className="h-5 w-5" aria-hidden="true" /></IconButton><div className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">{photoCounter}</div></> : null}
      </div>
      {showGalleryControls ? <div className="flex max-w-full gap-2 overflow-x-auto p-3">{usableIndices.map((imageIndex, visibleIndex) => { const thumbnailUrl = displayCandidates[imageIndex]; return <button key={thumbnailUrl} type="button" aria-pressed={activeIndex === imageIndex} aria-label={selectPhotoLabel.replace("{{number}}", String(visibleIndex + 1))} className={activeIndex === imageIndex ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-blue ring-offset-2" : "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"} onClick={() => onSelectImage(imageIndex)}><Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="96px" onError={() => onImageError(thumbnailUrl)} /></button>; })}</div> : null}
    </Card>
  );
}
