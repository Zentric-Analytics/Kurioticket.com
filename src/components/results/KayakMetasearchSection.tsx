import { isKayakSandboxEnabled, type KayakVertical } from "@/services/travel/kayakSandbox";
import { KayakMetasearchClient } from "./KayakMetasearchClient";
import type { ReactNode } from "react";
import { kayakSearchCriteria } from "./kayakSearchCriteria";

/** Add a provider without replacing or blocking the existing results pipeline. */
export function KayakMetasearchSection({ vertical, params, children }: {
  vertical: KayakVertical; params: Record<string, string | string[] | undefined>; children?: ReactNode;
}) {
  if (!isKayakSandboxEnabled()) return children ?? null;
  const criteria = kayakSearchCriteria(params);
  return <KayakMetasearchClient key={JSON.stringify([vertical, criteria])} vertical={vertical} criteria={criteria}>{children}</KayakMetasearchClient>;
}
