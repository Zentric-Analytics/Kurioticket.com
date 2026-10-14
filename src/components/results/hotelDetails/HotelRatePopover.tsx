"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
import styles from "./HotelRatePopover.module.css";

export function HotelRatePopover({ offer, anchor, onClose, closeOnOutsideScroll = false }: { offer: HotelDetailsProviderOffer; anchor: HTMLButtonElement; onClose: () => void; closeOnOutsideScroll?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  const [position, setPosition] = useState({ left: 0, top: 0, pointer: 20, side: "top", ready: false });
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const vx = viewport?.offsetLeft ?? 0, vy = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      element.style.maxWidth = `${Math.max(0, width - 24)}px`;
      element.style.maxHeight = `${Math.max(100, height - 24)}px`;
      const box = element.getBoundingClientRect();
      const right = rect.right + 12 + box.width <= vx + width - 12;
      let left = right ? rect.right + 12 : Math.max(vx + 12, Math.min(rect.left + rect.width / 2 - box.width / 2, vx + width - box.width - 12));
      let top = right ? rect.top - 20 : rect.bottom + 12;
      let side = right ? "left" : "top";
      if (!right && top + box.height > vy + height - 12 && rect.top - box.height - 12 >= vy + 12) { top = rect.top - box.height - 12; side = "bottom"; }
      top = Math.max(vy + 12, Math.min(top, vy + height - box.height - 12));
      left = Math.max(vx + 12, left);
      const pointer = side === "left" ? Math.max(16, Math.min(rect.top + rect.height / 2 - top, box.height - 16)) : Math.max(16, Math.min(rect.left + rect.width / 2 - left, box.width - 16));
      setPosition({ left, top, pointer, side, ready: true });
    };
    update();
    element.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !element.contains(event.target) && !anchor.contains(event.target)) close.current(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close.current(); anchor.focus({ preventScroll: true }); } };
    const scroll = (event: Event) => { if (event.target instanceof Node && element.contains(event.target)) return; if (closeOnOutsideScroll) { close.current(); return; } const bounds = anchor.getBoundingClientRect(); if (bounds.bottom < 0 || bounds.top > window.innerHeight) close.current(); else update(); };
    const focus = (event: FocusEvent) => { if (event.target instanceof Node && !element.contains(event.target) && event.target !== anchor) close.current(); };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    window.addEventListener("scroll", scroll, true);
    if (closeOnOutsideScroll) window.addEventListener("wheel", scroll, { passive: true, capture: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => { observer.disconnect(); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); document.removeEventListener("focusin", focus); window.removeEventListener("scroll", scroll, true); window.removeEventListener("wheel", scroll, true); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); window.visualViewport?.removeEventListener("scroll", update); };
  }, [anchor, closeOnOutsideScroll]);
  return createPortal(<div ref={panel} role="dialog" aria-label="Rate details" tabIndex={-1} className={styles.popover} style={{ left: position.left, top: position.top, visibility: position.ready ? "visible" : "hidden" }}>
    <span className={`${styles.pointer} ${styles[position.side]}`} style={position.side === "left" ? { top: position.pointer } : { left: position.pointer }} aria-hidden="true" />
    <div className={styles.content}>
      <header><h2>Rate details</h2><button type="button" aria-label="Close Rate details" onClick={() => { onClose(); anchor.focus({ preventScroll: true }); }}><X size={18} /></button></header>
      <section><p className={styles.provider}>{offer.providerName}</p><p className={styles.room}>{offer.roomName || "Room description not supplied"}</p>{[offer.bedConfiguration, offer.mealPlanLabel].filter(Boolean).map((term, index) => <p key={index}>{term}</p>)}</section>
      {offer.cancellationLabel || offer.paymentLabel ? <section><h3>Booking conditions</h3><dl>{offer.cancellationLabel ? <div><dt>Cancellation</dt><dd>{offer.cancellationLabel}</dd></div> : null}{offer.paymentLabel ? <div><dt>Payment</dt><dd>{offer.paymentLabel}</dd></div> : null}</dl></section> : null}
      {offer.suppliedRateFacts?.length || offer.taxesAndFeesLabel ? <section><h3>Price details</h3><dl>{offer.suppliedRateFacts?.map((fact, index) => <div key={index}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{offer.taxesAndFeesLabel ? <p>{offer.taxesAndFeesLabel}</p> : null}</section> : null}
      {offer.totalPrice ? <div className={styles.total}><span>Stay total</span><strong>{offer.totalPrice}</strong></div> : null}
    </div>
  </div>, document.body);
}
