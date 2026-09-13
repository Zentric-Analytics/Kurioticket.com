"use client";
import { createContext, useContext } from "react";
import type { SandboxOffer, KayakVertical } from "@/services/travel/kayakSandbox";
export const KayakResultsContext = createContext<{vertical:KayakVertical;offers:SandboxOffer[];criteria:Record<string,string>} | null>(null);
export const useKayakResults = () => useContext(KayakResultsContext);
