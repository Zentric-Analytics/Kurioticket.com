// Preserve the existing desktop format and the already-converted amount.
export function MobileHotelPriceText({ text, mobileText: suppliedMobileText }: { text: string; mobileText?: string }) {
  const mobileText = suppliedMobileText ?? text.replace(/\bNGN[\s\u00a0\u202f]*/g, "₦");
  if (mobileText === text) return <>{text}</>;

  return <><span className="sm:hidden">{mobileText}</span><span className="hidden sm:inline">{text}</span></>;
}
