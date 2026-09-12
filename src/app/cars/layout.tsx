import type { ReactNode } from "react";
import { KayakSandboxEntry } from "@/components/results/KayakSandboxEntry";

export default function CarsLayout({ children }: { children: ReactNode }) {
  return <><KayakSandboxEntry vertical="cars" />{children}</>;
}
