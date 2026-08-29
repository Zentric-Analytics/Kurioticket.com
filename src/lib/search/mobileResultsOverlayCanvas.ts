const OVERLAY_OPEN_ATTRIBUTE = "data-mobile-results-overlay-open";
const OVERLAY_THEME_ATTRIBUTE = "data-mobile-results-overlay-theme";

export const MOBILE_RESULTS_OVERLAY_CANVAS_COLOR = "#a6a8ae";

let ownerCount = 0;
let originalThemeMeta: HTMLMetaElement | null = null;
let originalThemeContent: string | null = null;
let createdThemeMeta: HTMLMetaElement | null = null;

export type MobileResultsOverlayCanvasRelease = () => void;

/** Keeps the browser-owned root canvas dimmed for as long as any Results overlay owns it. */
export function acquireMobileResultsOverlayCanvas(): MobileResultsOverlayCanvasRelease {
  if (ownerCount === 0) {
    originalThemeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    originalThemeContent = originalThemeMeta?.getAttribute("content") ?? null;

    const themeMeta = originalThemeMeta ?? document.createElement("meta");
    if (!originalThemeMeta) {
      themeMeta.setAttribute("name", "theme-color");
      themeMeta.setAttribute(OVERLAY_THEME_ATTRIBUTE, "");
      document.head.appendChild(themeMeta);
      createdThemeMeta = themeMeta;
    }
    themeMeta.setAttribute("content", MOBILE_RESULTS_OVERLAY_CANVAS_COLOR);
    document.documentElement.setAttribute(OVERLAY_OPEN_ATTRIBUTE, "");
  }

  ownerCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    ownerCount = Math.max(0, ownerCount - 1);
    if (ownerCount === 0) {
      if (createdThemeMeta) {
        createdThemeMeta.remove();
        document
          .querySelectorAll<HTMLMetaElement>(`meta[${OVERLAY_THEME_ATTRIBUTE}]`)
          .forEach((meta) => meta.remove());
      } else if (originalThemeMeta?.isConnected) {
        if (originalThemeContent === null) originalThemeMeta.removeAttribute("content");
        else originalThemeMeta.setAttribute("content", originalThemeContent);
      } else {
        const currentThemeMeta = document.querySelector<HTMLMetaElement>(
          'meta[name="theme-color"]',
        );
        if (
          currentThemeMeta?.getAttribute("content") ===
          MOBILE_RESULTS_OVERLAY_CANVAS_COLOR
        ) {
          if (originalThemeContent === null) currentThemeMeta.removeAttribute("content");
          else currentThemeMeta.setAttribute("content", originalThemeContent);
        }
      }
      document.documentElement.removeAttribute(OVERLAY_OPEN_ATTRIBUTE);
      originalThemeMeta = null;
      originalThemeContent = null;
      createdThemeMeta = null;
    }
  };
}
