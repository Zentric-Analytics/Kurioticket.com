import { isIP } from "node:net";
import { getClientIp } from "./rate-limit";

/** Render public ingress is Cloudflare-backed; never trust caller-provided XFF. */
export function getKayakClientIp(request: Request, render = process.env.RENDER === "true") {
  const value = render
    ? request.headers.get("cf-connecting-ip")?.trim() || ""
    : getClientIp(request);
  return isIP(value) ? value : "";
}
