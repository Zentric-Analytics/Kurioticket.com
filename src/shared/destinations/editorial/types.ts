export type ExploreDestinationEditorialSourceReference = {
  readonly title: string;
  readonly url: `https://${string}`;
};

export type ExploreDestinationEditorialProvenance = {
  readonly source: "kurioticket-editorial";
  readonly sourceReferences: readonly ExploreDestinationEditorialSourceReference[];
  readonly lastVerifiedAt: string;
};

export type ExploreDestinationEditorial = {
  /** Must resolve to one destination in the canonical Explore catalogue. */
  readonly id: string;
  readonly summary: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly editorialProvenance: ExploreDestinationEditorialProvenance;
};
