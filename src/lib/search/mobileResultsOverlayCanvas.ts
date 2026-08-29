const OVERLAY_OPEN_ATTRIBUTE = "data-mobile-results-overlay-open";
const OVERLAY_THEME_ATTRIBUTE = "data-mobile-results-overlay-theme";
const ACTIVE_CANVAS_PROPERTY = "--mobile-results-overlay-active-canvas";

export const MOBILE_RESULTS_OVERLAY_CANVAS_COLOR = "#a6a8ae";

let ownerCount = 0;
let originalThemeMeta: HTMLMetaElement | null = null;
let originalThemeContent: string | null = null;
let createdThemeMeta: HTMLMetaElement | null = null;
let originalActiveCanvasValue = "";
let activeCanvasColor = MOBILE_RESULTS_OVERLAY_CANVAS_COLOR;

export type MobileResultsOverlayCanvasOptions = {
  canvasColor?: string;
};

export type MobileResultsOverlayCanvasRelease = () => void;

/** Keeps the browser-owned root canvas dimmed for as long as any Results overlay owns it. */
export function acquireMobileResultsOverlayCanvas(
  options?: MobileResultsOverlayCanvasOptions,
): MobileResultsOverlayCanvasRelease {
  if (ownerCount === 0) {
    activeCanvasColor =
      options?.canvasColor ?? MOBILE_RESULTS_OVERLAY_CANVAS_COLOR;
    originalThemeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    originalThemeContent = originalThemeMeta?.getAttribute("content") ?? null;
    originalActiveCanvasValue = document.documentElement.style.getPropertyValue(
      ACTIVE_CANVAS_PROPERTY,
    );

    const themeMeta = originalThemeMeta ?? document.createElement("meta");
    if (!originalThemeMeta) {
      themeMeta.setAttribute("name", "theme-color");
      themeMeta.setAttribute(OVERLAY_THEME_ATTRIBUTE, "");
      document.head.appendChild(themeMeta);
      createdThemeMeta = themeMeta;
    }
    themeMeta.setAttribute("content", activeCanvasColor);
    document.documentElement.style.setProperty(
      ACTIVE_CANVAS_PROPERTY,
      activeCanvasColor,
    );
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
          activeCanvasColor
        ) {
          if (originalThemeContent === null) currentThemeMeta.removeAttribute("content");
          else currentThemeMeta.setAttribute("content", originalThemeContent);
        }
      }
      if (originalActiveCanvasValue) {
        document.documentElement.style.setProperty(
          ACTIVE_CANVAS_PROPERTY,
          originalActiveCanvasValue,
        );
      } else {
        document.documentElement.style.removeProperty(ACTIVE_CANVAS_PROPERTY);
      }
      document.documentElement.removeAttribute(OVERLAY_OPEN_ATTRIBUTE);
      originalThemeMeta = null;
      originalThemeContent = null;
      createdThemeMeta = null;
      originalActiveCanvasValue = "";
      activeCanvasColor = MOBILE_RESULTS_OVERLAY_CANVAS_COLOR;
    }
  };
}
