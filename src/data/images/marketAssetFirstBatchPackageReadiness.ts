export type MarketAssetFirstBatchPackageFileId =
  | "handoff"
  | "transferChecklist"
  | "transferCompletions"
  | "manifest"
  | "status";

export type MarketAssetFirstBatchPackageFile = {
  id: MarketAssetFirstBatchPackageFileId;
  path: string;
  present: boolean;
};

export type MarketAssetFirstBatchPackageReadinessInput = {
  handoff?: boolean;
  transferChecklist?: boolean;
  transferCompletions?: boolean;
  manifest?: boolean;
  status?: boolean;
};

export type MarketAssetFirstBatchPackageReadinessResult = {
  ready: boolean;
  requiredFileCount: number;
  presentFileCount: number;
  missingFileIds: MarketAssetFirstBatchPackageFileId[];
  files: MarketAssetFirstBatchPackageFile[];
};

export type MarketAssetFirstBatchPackageReadinessOptions = {
  fileSuffix?: string;
};

const requiredFileIds: MarketAssetFirstBatchPackageFileId[] = [
  "handoff",
  "transferChecklist",
  "transferCompletions",
  "manifest",
  "status",
];

export function checkMarketAssetFirstBatchPackageReadiness(
  input: MarketAssetFirstBatchPackageReadinessInput,
  options: MarketAssetFirstBatchPackageReadinessOptions = {},
): MarketAssetFirstBatchPackageReadinessResult {
  const fileSuffix = options.fileSuffix ?? "us-001";
  const files = requiredFileIds.map((id) => ({
    id,
    path: buildFirstBatchPackageFilePath(id, fileSuffix),
    present: Boolean(input[id]),
  }));
  const missingFileIds = files.filter((file) => !file.present).map((file) => file.id);

  return {
    ready: missingFileIds.length === 0,
    requiredFileCount: files.length,
    presentFileCount: files.length - missingFileIds.length,
    missingFileIds,
    files,
  };
}

function buildFirstBatchPackageFilePath(
  id: MarketAssetFirstBatchPackageFileId,
  fileSuffix: string,
): string {
  switch (id) {
    case "handoff":
      return `intake-handoff-${fileSuffix}.json`;
    case "transferChecklist":
      return `transfer-checklist-${fileSuffix}.json`;
    case "transferCompletions":
      return `transfer-completions-${fileSuffix}.json`;
    case "manifest":
      return `manifest-${fileSuffix}.json`;
    case "status":
      return `first-batch-status-${fileSuffix}.json`;
  }
}
