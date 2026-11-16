"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const CmsOperation = createContext<{ busy: boolean; setBusy: (busy: boolean) => void }>({ busy: false, setBusy: () => {} });

/** Lock the editor and revision actions together while an external restore runs. */
export function CmsOperationProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const value = useMemo(() => ({ busy, setBusy }), [busy]);
  return <CmsOperation.Provider value={value}>{children}</CmsOperation.Provider>;
}
export function useCmsOperation() { return useContext(CmsOperation); }
