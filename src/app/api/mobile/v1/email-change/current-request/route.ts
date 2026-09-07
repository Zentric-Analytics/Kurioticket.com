import { createMobileEmailChangeHandler } from "@/lib/mobileEmailChange";
import { mobileEmailChangeDependencies } from "@/lib/mobileEmailChangeDependencies";
export const runtime = "nodejs";
export const POST = createMobileEmailChangeHandler(
  "current-request",
  mobileEmailChangeDependencies,
);
