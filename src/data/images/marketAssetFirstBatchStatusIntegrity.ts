import type { MarketAssetFirstBatchStatusInput } from "./marketAssetFirstBatchStatusSummary";

export type MarketAssetFirstBatchStatusIntegrityResult = {
  valid: boolean;
  errors: string[];
};

type GateId = keyof MarketAssetFirstBatchStatusInput;

const orderedGates: GateId[] = [
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

const gateLabels: Record<GateId, string> = {
  handoffGenerated: "handoff generation",
  handoffReady: "handoff readiness",
  transferChecklistGenerated: "transfer checklist generation",
  transferCompletionsGenerated: "transfer completion overlay generation",
  manifestGenerated: "manifest generation",
  transferReady: "transfer readiness",
  manifestReady: "manifest review",
  conflictsClear: "conflict checks",
  converted: "conversion",
};

export function checkMarketAssetFirstBatchStatusIntegrity(
  status: MarketAssetFirstBatchStatusInput,
): MarketAssetFirstBatchStatusIntegrityResult {
  const errors: string[] = [];

  orderedGates.forEach((gate, index) => {
    if (!status[gate]) {
      return;
    }

    const missingPreviousGate = orderedGates.slice(0, index).find((previousGate) => !status[previousGate]);

    if (missingPreviousGate) {
      errors.push(
        `${gateLabels[gate]} cannot be marked complete before ${gateLabels[missingPreviousGate]} passes.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
