export type NativeCarResultIdentity = {
  primaryName: string;
  secondaryModel: string | null;
};

const MERCEDES_BENZ_PREFIX = "Mercedes-Benz ";

export function nativeCarResultIdentity(modelName: string): NativeCarResultIdentity {
  const normalizedModelName = modelName.trim().replace(/\s+/g, " ");

  if (normalizedModelName.startsWith(MERCEDES_BENZ_PREFIX)) {
    const secondaryModel = normalizedModelName.slice(MERCEDES_BENZ_PREFIX.length).trim();
    if (secondaryModel) return { primaryName: "Mercedes-Benz", secondaryModel };
  }

  return { primaryName: normalizedModelName, secondaryModel: null };
}
