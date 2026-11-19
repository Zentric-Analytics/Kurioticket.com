import { flushSync } from "react-dom";

/** Open a mobile picker and focus its real search input in the activating event. */
export function openMobilePickerWithKeyboard(
  openPicker: () => void,
  inputId: string,
) {
  if (typeof document === "undefined") {
    openPicker();
    return;
  }

  flushSync(openPicker);
  const input = document.getElementById(inputId);
  if (input instanceof HTMLInputElement) {
    input.focus({ preventScroll: true });
  }
}
