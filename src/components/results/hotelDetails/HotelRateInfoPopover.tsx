"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

type Placement = "right" | "left" | "below" | "above";

type Geometry = {
  left: number;
  top: number;
  placement: Placement;
  arrowOffset: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function HotelRateInfoPopover({
  offer,
  anchor,
  onClose,
}: {
  offer: HotelDetailsProviderOffer;
  anchor: HTMLButtonElement;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const updatePosition = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover || !anchor.isConnected) {
      if (!anchor.isConnected) onClose();
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (
      anchorRect.bottom < 0 ||
      anchorRect.top > viewportHeight ||
      anchorRect.right < 0 ||
      anchorRect.left > viewportWidth
    ) {
      onClose();
      return;
    }

    const panelRect = popover.getBoundingClientRect();
    const width = panelRect.width;
    const height = panelRect.height;
    const mobile = viewportWidth < 640;
    const gutter = mobile ? 12 : 16;
    const offset = 10;
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const roomRight = viewportWidth - anchorRect.right - offset - gutter;
    const roomLeft = anchorRect.left - offset - gutter;
    const roomBelow = viewportHeight - anchorRect.bottom - offset - gutter;
    const roomAbove = anchorRect.top - offset - gutter;

    let placement: Placement;
    let left: number;
    let top: number;

    if (!mobile && roomRight >= width) {
      placement = "right";
      left = anchorRect.right + offset;
      top = clamp(anchorCenterY - height / 2, gutter, viewportHeight - height - gutter);
    } else if (!mobile && roomLeft >= width) {
      placement = "left";
      left = anchorRect.left - width - offset;
      top = clamp(anchorCenterY - height / 2, gutter, viewportHeight - height - gutter);
    } else if (roomBelow >= height || roomBelow >= roomAbove) {
      placement = "below";
      left = clamp(anchorCenterX - width / 2, gutter, viewportWidth - width - gutter);
      top = clamp(anchorRect.bottom + offset, gutter, viewportHeight - height - gutter);
    } else {
      placement = "above";
      left = clamp(anchorCenterX - width / 2, gutter, viewportWidth - width - gutter);
      top = clamp(anchorRect.top - height - offset, gutter, viewportHeight - height - gutter);
    }

    const arrowOffset =
      placement === "left" || placement === "right"
        ? clamp(anchorCenterY - top - 6, 18, height - 24)
        : clamp(anchorCenterX - left - 6, 18, width - 24);

    setGeometry({ left, top, placement, arrowOffset });
  }, [anchor, onClose]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (anchor.isConnected) {
        anchor.focus({ preventScroll: true });
      }
    };
  }, [anchor]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updatePosition);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose, updatePosition]);

  if (typeof document === "undefined") return null;

  const arrowStyle =
    geometry?.placement === "right" || geometry?.placement === "left"
      ? { top: geometry.arrowOffset }
      : { left: geometry?.arrowOffset ?? 24 };

  const arrowClass =
    geometry?.placement === "right"
      ? "-left-1.5"
      : geometry?.placement === "left"
        ? "-right-1.5"
        : geometry?.placement === "above"
          ? "-bottom-1.5"
          : "-top-1.5";

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Rate details"
      data-hotel-rate-info-popover
      data-placement={geometry?.placement}
      className="fixed z-[1200] w-[min(390px,calc(100vw-24px))]"
      style={{
        left: geometry?.left ?? 12,
        top: geometry?.top ?? 12,
        visibility: geometry ? "visible" : "hidden",
      }}
    >
      <span
        aria-hidden="true"
        className={`absolute z-0 h-3 w-3 rotate-45 border border-slate-200 bg-white ${arrowClass}`}
        style={arrowStyle}
      />

      <section className="relative z-[1] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-[#192024] shadow-[0_16px_42px_rgba(15,23,42,0.18)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <header className="sticky top-0 z-[2] flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-[16px] font-semibold leading-6">Rate details</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close Rate details"
            onClick={onClose}
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 pb-4">
          <section className="border-b border-slate-200 py-3">
            {offer.providerLogoUrl ? (
              <Image
                src={offer.providerLogoUrl}
                alt={offer.providerName}
                width={132}
                height={30}
                className="h-6 w-auto max-w-[132px] object-contain object-left"
              />
            ) : (
              <p className="text-[13px] font-semibold leading-5 text-[#192024]">
                {offer.providerName}
              </p>
            )}
            <h3 className="mt-1 text-[14px] font-medium leading-5">
              {offer.roomName || "Room description not supplied"}
            </h3>
            {[offer.bedConfiguration, offer.mealPlanLabel]
              .filter(Boolean)
              .map((term, index) => (
                <p key={index} className="mt-1 text-[13px] leading-5 text-[#59636A]">
                  {term}
                </p>
              ))}
          </section>

          {offer.cancellationLabel || offer.paymentLabel ? (
            <section className="border-b border-slate-200 py-3">
              <h3 className="mb-2 text-[13px] font-semibold leading-5">
                Booking conditions
              </h3>
              <dl className="grid gap-2 text-[13px] leading-5">
                {offer.cancellationLabel ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4">
                    <dt className="text-[#59636A]">Cancellation</dt>
                    <dd className="text-right font-medium">{offer.cancellationLabel}</dd>
                  </div>
                ) : null}
                {offer.paymentLabel ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4">
                    <dt className="text-[#59636A]">Payment</dt>
                    <dd className="text-right font-medium">{offer.paymentLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {offer.suppliedRateFacts?.length || offer.taxesAndFeesLabel ? (
            <section className="border-b border-slate-200 py-3">
              <h3 className="mb-2 text-[13px] font-semibold leading-5">Price details</h3>
              <dl className="grid gap-2 text-[13px] leading-5">
                {offer.suppliedRateFacts?.map((fact, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4"
                  >
                    <dt className="text-[#59636A]">{fact.label}</dt>
                    <dd className="text-right font-medium tabular-nums">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {offer.taxesAndFeesLabel ? (
                <p className="mt-2 text-[13px] leading-5 text-[#59636A]">
                  {offer.taxesAndFeesLabel}
                </p>
              ) : null}
            </section>
          ) : null}

          {offer.totalPrice ? (
            <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-[#F3F7FC] px-3.5 py-3">
              <span className="text-[13px] font-semibold leading-5">Stay total</span>
              <strong className="text-[17px] font-semibold leading-6 tabular-nums">
                {offer.totalPrice}
              </strong>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
