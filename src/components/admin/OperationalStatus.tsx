import { OperationsStatus } from "./TravelOperationsOverviewUI";
import type { OperationalState } from "@/services/platformOperationsContract";

const states: Record<OperationalState, {
  label: string;
  tone: "good" | "bad" | "warn" | "neutral" | "info";
}> = {
  HEALTHY: { label: "Healthy", tone: "good" },
  DEGRADED: { label: "Degraded", tone: "warn" },
  FAILING: { label: "Failing", tone: "bad" },
  DISABLED: { label: "Disabled", tone: "info" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
  MONITORING_UNAVAILABLE: { label: "Monitoring unavailable", tone: "warn" },
};

export function OperationalStatus({ state }: { state: string }) {
  const value = states[state as OperationalState] ?? states.UNKNOWN;
  return <OperationsStatus tone={value.tone}>{value.label}</OperationsStatus>;
}
