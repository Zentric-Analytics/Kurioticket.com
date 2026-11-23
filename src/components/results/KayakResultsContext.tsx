"use client";
import { createContext, useContext } from "react";
import type { SandboxOffer, KayakVertical } from "@/services/travel/kayakSandbox";
export type ProviderSearchStatus = "loading" | "success" | "error" | "needs-input";
export const KayakResultsContext = createContext<{vertical:KayakVertical;offers:SandboxOffer[];criteria:Record<string,string>;status?:ProviderSearchStatus;retry?:()=>void} | null>(null);
export const useKayakResults = () => useContext(KayakResultsContext);
