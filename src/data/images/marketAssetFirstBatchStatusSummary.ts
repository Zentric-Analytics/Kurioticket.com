export type MarketAssetFirstBatchGateStatus = "pending" | "passed" | "failed";

export type MarketAssetFirstBatchStatusInput = {
  handoffGenerated?: boolean;
  handoffReady?: boolean;
  transferChecklistGenerated?: boolean;
  transferCompletionsGenerated?: boolean;
  manifestGenerated?: boolean;
  transferReady?: boolean;
  manifestReady?: boolean;
  conflictsClear?: boolean;
  converted?: boolean;
};

export type MarketAssetFirstBatchStatusGate = {
  id: keyof MarketAssetFirstBatchStatusInput;
  label: string;
  status: MarketAssetFirstBatchGateStatus;
};

export type MarketAssetFirstBatchStatusSummary = {
  batchId: string;
  market: string;
  readyForConversion: boolean;
  converted: boolean;
  completedGateCount: number;
  totalGateCount: number;
  nextGate: MarketAssetFirstBatchStatusGate | null;
  gates: MarketAssetFirstBatchStatusGate[];
};

const gateLabels: Record<keyof MarketAssetFirstBatchStatusInput, string> = {
  handoffGenerated: "Intake handoff generated",
  handoffReady: "Intake handoff readiness passed",
  transferChecklistGenerated: "Transfer checklist generated",
  transferCompletionsGenerated: "Transfer completion overlay generated",
  manifestGenerated: "Manifest template generated",
  transferReady: "Transfer readiness passed",
  manifestReady: "Final manifest review passed",
  conflictsClear: "Manifest conflict checks passed",
  converted: "Approved manifest converted",
};

const gateOrder: Array<keyof MarketAssetFirstBatchStatusInput> = [
  "handoffGenerated",
  "handoffReady",
  "transferChecklistGenerated",
  "transferCompletionsGenerated",
  "manifestGenerated",
  "transferReady",
  "manifestReady",
  "conflictsClear",
  "converted",
];

export type MarketAssetFirstBatchStatusSummaryOptions = {
  batchId?: string;
  market?: string;
};

export function summarizeMarketAssetFirstBatchStatus(
  input: MarketAssetFirstBatchStatusInput = {},
  options: MarketAssetFirstBatchStatusSummaryOptions = {},
): MarketAssetFirstBatchStatusSummary {
  const gates = gateOrder.map((id) => ({
    id,
    label: gateLabels[id],
    status: input[id] ? "passed" : "pending",
  })) satisfies MarketAssetFirstBatchStatusGate[];
  const completedGateCount = gates.filter((gate) => gate.status === "passed").length;
  const nextGate = gates.find((gate) => gate.status !== "passed") ?? null;

  return {
    batchId: options.batchId ?? "market-assets-2026-07-us-001",
    market: options.market ?? "US",
    readyForConversion:
      Boolean(input.handoffReady) &&
      Boolean(input.transferReady) &&
      Boolean(input.manifestReady) &&
      Boolean(input.conflictsClear),
    converted: Boolean(input.converted),
    completedGateCount,
    totalGateCount: gates.length,
    nextGate,
    gates,
  };
}
