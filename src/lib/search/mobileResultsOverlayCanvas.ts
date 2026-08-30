const OVERLAY_OPEN_ATTRIBUTE = "data-mobile-results-overlay-open";
const OVERLAY_THEME_ATTRIBUTE = "data-mobile-results-overlay-theme";
const ACTIVE_CANVAS_PROPERTY = "--mobile-results-overlay-active-canvas";

export const MOBILE_RESULTS_OVERLAY_CANVAS_COLOR = "#a6a8ae";

type CanvasOwner = { color: string };
type CanvasSession = {
  document: Document;
  root: HTMLElement;
  themeMeta: HTMLMetaElement;
  createdThemeMeta: boolean;
  originalThemeContent: string | null;
  originalActiveCanvasValue: string;
  originalOpenAttribute: string | null;
};

const owners = new Map<symbol, CanvasOwner>();
let session: CanvasSession | null = null;

export type MobileResultsOverlayCanvasOptions = { canvasColor?: string };
export type MobileResultsOverlayCanvasRelease = () => void;

function applyActiveOwner() {
  if (!session) return;
  const activeOwner = Array.from(owners.values()).at(-1);
  if (!activeOwner) return;
  session.themeMeta.setAttribute("content", activeOwner.color);
  session.root.style.setProperty(ACTIVE_CANVAS_PROPERTY, activeOwner.color);
  session.root.setAttribute(OVERLAY_OPEN_ATTRIBUTE, "");
}

function restoreSession() {
  if (!session) return;
  const currentSession = session;
  session = null;

  if (currentSession.createdThemeMeta) {
    currentSession.themeMeta.remove();
    currentSession.document
      .querySelectorAll<HTMLMetaElement>(`meta[${OVERLAY_THEME_ATTRIBUTE}]`)
      .forEach((meta) => meta.remove());
  } else if (currentSession.themeMeta.isConnected) {
    if (currentSession.originalThemeContent === null) {
      currentSession.themeMeta.removeAttribute("content");
    } else {
      currentSession.themeMeta.setAttribute(
        "content",
        currentSession.originalThemeContent,
      );
    }
  }

  if (currentSession.originalActiveCanvasValue) {
    currentSession.root.style.setProperty(
      ACTIVE_CANVAS_PROPERTY,
      currentSession.originalActiveCanvasValue,
    );
  } else {
    currentSession.root.style.removeProperty(ACTIVE_CANVAS_PROPERTY);
  }
  if (currentSession.originalOpenAttribute === null) {
    currentSession.root.removeAttribute(OVERLAY_OPEN_ATTRIBUTE);
  } else {
    currentSession.root.setAttribute(
      OVERLAY_OPEN_ATTRIBUTE,
      currentSession.originalOpenAttribute,
    );
  }
}

/** Keeps the browser-owned root canvas dimmed until the final tokenized owner releases it. */
export function acquireMobileResultsOverlayCanvas(
  options?: MobileResultsOverlayCanvasOptions,
): MobileResultsOverlayCanvasRelease {
  const owner = Symbol("mobile-results-overlay-canvas-owner");
  const color = options?.canvasColor ?? MOBILE_RESULTS_OVERLAY_CANVAS_COLOR;

  if (!session) {
    const root = document.documentElement;
    const existingThemeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const themeMeta = existingThemeMeta ?? document.createElement("meta");
    if (!existingThemeMeta) {
      themeMeta.setAttribute("name", "theme-color");
      themeMeta.setAttribute(OVERLAY_THEME_ATTRIBUTE, "");
      document.head.appendChild(themeMeta);
    }
    session = {
      document,
      root,
      themeMeta,
      createdThemeMeta: !existingThemeMeta,
      originalThemeContent: themeMeta.getAttribute("content"),
      originalActiveCanvasValue: root.style.getPropertyValue(
        ACTIVE_CANVAS_PROPERTY,
      ),
      originalOpenAttribute: root.getAttribute(OVERLAY_OPEN_ATTRIBUTE),
    };
  }

  owners.set(owner, { color });
  applyActiveOwner();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners.delete(owner);
    if (owners.size > 0) applyActiveOwner();
    else restoreSession();
  };
}
