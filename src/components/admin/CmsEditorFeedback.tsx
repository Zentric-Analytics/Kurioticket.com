"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsFieldErrors } from "@/lib/cmsContentValidation";

const Errors = createContext<CmsFieldErrors>({});
export function CmsValidationProvider({ errors, children }: { errors: CmsFieldErrors; children: ReactNode }) {
  return <Errors.Provider value={errors}>{children}</Errors.Provider>;
}
export function CmsFieldError({ name }: { name: string }) {
  const errors = useContext(Errors)[name];
  return errors?.length ? <p data-cms-field-error={name} role="alert" className="mt-1 text-[12px] leading-5 text-rose-700">{errors.join(" ")}</p> : null;
}
export function CmsSuccessMessage({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  return message ? <div className="flex items-start gap-3 text-[13px] leading-5 text-emerald-700" role="status">
    <p>{message}</p><button type="button" aria-label="Dismiss success message" onClick={onDismiss} className="cursor-pointer underline underline-offset-2">Dismiss</button>
  </div> : null;
}
