export const flightResultCountLabel = (count: number) =>
  count === 0
    ? "Searching for flights…"
    : `${count} ${count === 1 ? "Result" : "Results"} found`;
