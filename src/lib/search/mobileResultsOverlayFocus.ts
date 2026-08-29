export type OverlayActivationModality = "pointer" | "keyboard" | "programmatic";

export type OverlayActivationEvent = Pick<MouseEvent, "detail">;

/** Browser-generated keyboard clicks have a detail of zero. */
export function getOverlayActivationModality(
  event: OverlayActivationEvent,
): OverlayActivationModality {
  return event.detail === 0 ? "keyboard" : "pointer";
}

export function isSafelyFocusableOverlayLauncher(
  launcher: HTMLElement | null | undefined,
): launcher is HTMLElement {
  return Boolean(
    launcher?.isConnected &&
    !launcher.hasAttribute("disabled") &&
    launcher.getAttribute("aria-hidden") !== "true",
  );
}

export function restoreOverlayLauncherFocus(
  launcher: HTMLElement | null | undefined,
  modality: OverlayActivationModality,
): boolean {
  if (modality !== "keyboard" || !isSafelyFocusableOverlayLauncher(launcher)) {
    return false;
  }
  launcher.focus({ preventScroll: true });
  return true;
}
