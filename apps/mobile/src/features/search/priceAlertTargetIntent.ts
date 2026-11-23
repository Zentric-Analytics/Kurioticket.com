export class PriceAlertTargetIntent {
  private generation = 0;

  beginOpen() {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(generation: number) {
    return generation === this.generation;
  }

  close() {
    this.generation += 1;
  }
}
