import { recordStartupDiagnostic } from "./startupDiagnostics";
const codes = new Set(["UpdateAssetsNotAvailable", "UpdateServerUnreachable", "UpdateHasInvalidSignature",
  "UpdateCodeSigningError", "UpdateFailedToLoad", "AssetsFailedToLoad", "JSRuntimeError", "InitializationError"]);
/** Read only; never clears logs, logs arbitrary messages or retains asset URLs/IDs. */
export async function recordNativeUpdateFailures(read: () => Promise<readonly { code?: unknown }[]>) {
  try {
    const entries = await read();
    for (const code of new Set(entries.slice(-20).map(entry => entry.code))) {
      if (typeof code === "string" && codes.has(code)) {
        const boundary = code === "UpdateServerUnreachable" ? "update-check"
          : code === "AssetsFailedToLoad" || code === "UpdateAssetsNotAvailable" ? "update-download"
          : code === "UpdateFailedToLoad" || code === "JSRuntimeError" ? "update-activation" : "update-initialization";
        recordStartupDiagnostic(boundary, code === "UpdateServerUnreachable" ? "network" : "error");
      }
    }
  } catch { recordStartupDiagnostic("update-initialization", "error"); }
}
