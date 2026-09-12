import type { ReactNode } from "react";
import { KayakSandboxEntry } from "@/components/results/KayakSandboxEntry";

export default function HotelsLayout({ children }: { children: ReactNode }) {
  return <><KayakSandboxEntry vertical="hotels" />{children}</>;
}
