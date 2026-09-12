import { isKayakSandboxEnabled, type KayakVertical } from "@/services/travel/kayakSandbox";
import { KayakMetasearchClient } from "./KayakMetasearchClient";

/** Add a provider without replacing or blocking the existing results pipeline. */
export function KayakMetasearchSection({ vertical, params }: {
  vertical: KayakVertical; params: Record<string, string | string[] | undefined>;
}) {
  if (!isKayakSandboxEnabled()) return null;
  const criteria = Object.fromEntries(Object.entries(params).flatMap(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined ? [] : [[key, first]];
  }));
  return <KayakMetasearchClient key={JSON.stringify([vertical, criteria])} vertical={vertical} criteria={criteria} />;
}
