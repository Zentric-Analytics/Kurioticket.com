"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { createOperationalHandoffContext, type OperationalHandoffProduct, type OperationalHandoffReader } from "@/lib/operationalHandoffContext";

type Handoff = {
  remember: (product: OperationalHandoffProduct, resultId: string, requestId: string | null) => void;
  prepare: (product: OperationalHandoffProduct, resultId: string) => OperationalHandoffReader;
};
const quiet: Handoff = { remember: () => undefined, prepare: () => () => ({}) };
const OperationalHandoffContext = createContext<Handoff>(quiet);

/** Independent of the optional journey provider and consent lifecycle. */
export function OperationalHandoffProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const actor = status === "unauthenticated" ? "guest" : status === "authenticated" && session?.user?.id ? "account:" + session.user.id : null;
  const [context] = useState(() => createOperationalHandoffContext());
  useLayoutEffect(() => {
    context.setActor(actor);
    return () => context.setActor(null);
  }, [actor, context]);
  const value: Handoff = {
    remember: (product, resultId, requestId) => context.remember(actor, product, resultId, requestId),
    prepare: (product, resultId) => context.prepare(actor, product, resultId),
  };
  return <OperationalHandoffContext.Provider value={value}>{children}</OperationalHandoffContext.Provider>;
}
export const useOperationalHandoff = () => useContext(OperationalHandoffContext);
