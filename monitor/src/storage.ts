import { Histogram, MetricPayload, PointType } from "./client";

export const storage: Record<string, MetricStorage> = {};

function storageKey(payload: MetricPayload): string {
  return `${payload.name}-${payload.type}`;
}

export function storeBatch(batch: MetricPayload[]): void {
  for (const payload of batch) {
    const key = storageKey(payload);
    if (!storage[key]) {
      if (payload.type === "histogram")
        storage[key] = new HistogramStorage(payload.name, payload.type);
      else storage[key] = new MetricStorage(payload.name, payload.type);
    }
    storage[key].store(payload);
  }
}

class MetricStorage {
  public readonly name: string;
  public readonly type: PointType;
  inMemory: MetricPayload[] = [];

  constructor(name: string, type: PointType) {
    this.name = name;
    this.type = type;
  }

  store(payload: MetricPayload): void {
    // Find the correct position to insert the new payload to maintain sorted order.
    // This is not an append-only data store, so we can insert. We don't know what order the points will come in, unfortunately.
    let low = 0;
    let high = this.inMemory.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.inMemory[mid].timestamp < payload.timestamp) low = mid + 1;
      else high = mid - 1;
    }
    this.inMemory.splice(low, 0, payload);
  }

  public summary(): string {
    return `${this.name}: ${this.inMemory.length} points`;
  }
}

class HistogramStorage extends MetricStorage {
  private readonly sortedInMemory: MetricPayload[] = [];
  private unit: string = "";

  constructor(name: string, type: PointType) {
    super(name, type);
    if (type !== "histogram") {
      throw new Error(
        "HistogramStorage can only be used with type 'histogram'"
      );
    }
  }

  store(payload: MetricPayload): void {
    super.store(payload);
    const histogramPayload = payload.point as Histogram;
    if (this.unit == "") this.unit = histogramPayload.unit; // Hacky :/
    // We store data sorted by value for easy percentile lookups.
    let low = 0;
    let high = this.sortedInMemory.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midValue = (this.sortedInMemory[mid].point as Histogram).value;
      if (midValue < histogramPayload.value) low = mid + 1;
      else high = mid - 1;
    }
    this.sortedInMemory.splice(low, 0, payload);
  }

  percentile(
    fraction: number,
    afterTimestamp?: number,
    beforeTimestamp?: number
  ): number {
    if (fraction < 0 || fraction > 1) throw new Error("Invalid percentile");
    if (afterTimestamp || beforeTimestamp) throw new Error("Not implemented");

    const percentileIndex = Math.floor(fraction * this.sortedInMemory.length);
    return (this.sortedInMemory[percentileIndex].point as Histogram).value;
  }

  public summary(): string {
    return `${this.name}: ${this.inMemory.length} points
    Median: ${this.percentile(0.5).toFixed(1)} ${this.unit}
    90th percentile: ${this.percentile(0.9).toFixed(1)} ${this.unit}`;
  }
}
