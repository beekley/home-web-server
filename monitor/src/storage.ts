import { Histogram, MetricPayload, PointType } from "./types";
import { renderSvg } from "./plot";

// This will be the new registry for metrics.
export const metrics: Map<string, Metric> = new Map();

export interface MetricOptions {
  buckets?: number[];
  unit?: string;
}

abstract class Metric {
  public readonly name: string;
  public readonly type: PointType;
  constructor(name: string, type: PointType) {
    this.name = name;
    this.type = type;
  }
  abstract observe(payload: MetricPayload): void;
  abstract summary(): string;
}

export class HistogramMetric extends Metric {
  // BUCKETS ARE NOT USED
  private readonly buckets: number[];
  private readonly bucketCounts: number[];
  private sum: number = 0;
  private count: number = 0;
  private unit: string;

  // To keep track of recent values for rendering, similar to old implementation.
  private readonly recentValues: MetricPayload[] = [];
  private readonly BUFFER_SIZE = 1000;

  constructor(name: string, opts: MetricOptions = {}) {
    super(name, "histogram");
    this.unit = opts.unit || "";
    // Default buckets like prometheus, but in ms for web latency.
    this.buckets = opts.buckets || [
      5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
    ];
    this.bucketCounts = new Array(this.buckets.length + 1).fill(0); // +1 for +Inf
  }

  observe(payload: MetricPayload): void {
    const point = payload.point as Histogram;
    const value = point.value;

    const bucketIndex = this.buckets.findIndex((b) => value <= b);
    if (bucketIndex === -1) {
      this.bucketCounts[this.bucketCounts.length - 1]++;
    } else {
      this.bucketCounts[bucketIndex]++;
    }

    this.sum += value;
    this.count++;

    // Add in list, sorted by timestamp, using binary search.
    let i = 0;
    let j = this.recentValues.length;
    while (i < j) {
      const mid = Math.floor((i + j) / 2);
      if (payload.timestamp < this.recentValues[mid].timestamp) {
        j = mid;
      } else {
        i = mid + 1;
      }
    }

    // Insert the new value at the correct position.
    this.recentValues.splice(i, 0, payload);

    // Purge old data.
    if (this.recentValues.length >= this.BUFFER_SIZE) {
      this.recentValues.shift();
    }

    if (this.unit === "" && point.unit) {
      this.unit = point.unit;
    }
  }

  summary(): string {
    if (this.recentValues.length === 0)
      return `<div style="text-align:center; padding: 20px; color: #666;">Not enough data to render SVG.</div>`;

    // TODO: make this configurable
    const windowMs = 1 * 1000; //; // second
    const historyMs = 60 * 60 * 1000; // 1 hour
    const groupedRecentValues: Record<string, number[]> = {};
    const series: Record<string, number[]> = {};

    const makeKey = (payload: MetricPayload): string =>
      JSON.stringify(payload.fields || {});

    // Prep keys
    for (const payload of this.recentValues) {
      const key = makeKey(payload);
      if (!groupedRecentValues[key]) {
        groupedRecentValues[key] = [];
      }
      if (!series[key]) {
        series[key] = [];
      }
    }

    const now = Date.now();
    for (let i = now - historyMs; i < now; i += windowMs) {
      // Get data points within window.
      const payloads = this.recentValues.filter(
        (v) => v.timestamp >= i && v.timestamp < i + windowMs,
      );

      // Fill data for each field key;
      for (let key of Object.keys(groupedRecentValues)) {
        // TODO: get configurable other values.
        const value =
          payloads.length === 0
            ? // TODO: replace with something more meaningful when missing data.
              0
            : median(
                payloads
                  .filter((p) => makeKey(p) === key)
                  .map((p) => {
                    const point = p.point as Histogram;
                    return point.value;
                  }),
              );
        console.log({ key, value });
        series[key].push(value);
      }
    }

    return renderSvg({
      xLabel: `Latency (${this.unit})`,
      yLabel: "Distribution",
      series,
      title: `${this.name} (${this.count} samples, avg: ${(
        this.sum / this.count
      ).toFixed(2)}${this.unit})`,
    });
  }
}

// I will leave Gauge and Counter for later, focus on Histogram first.
// The old implementation had MetricStorage for everything else. I'll make a simple one.
export class Gauge extends Metric {
  private values: MetricPayload[] = [];
  private readonly BUFFER_SIZE = 1000;

  constructor(name: string) {
    super(name, "gauge");
  }

  observe(payload: MetricPayload): void {
    if (this.values.length >= this.BUFFER_SIZE) {
      this.values.shift();
    }
    this.values.push(payload);
  }

  summary(): string {
    return `${this.name} (gauge): ${this.values[this.values.length - 1].point}`;
  }
}

export function storeBatch(batch: MetricPayload[]): void {
  for (const payload of batch) {
    if (!metrics.has(payload.name)) {
      // Metric not registered, create with defaults
      if (payload.type === "histogram") {
        metrics.set(
          payload.name,
          new HistogramMetric(payload.name, {
            unit: (payload.point as Histogram).unit,
          }),
        );
      } else if (payload.type === "gauge") {
        metrics.set(payload.name, new Gauge(payload.name));
      } else {
        // default/counter not implemented yet, skip
        continue;
      }
    }
    const metric = metrics.get(payload.name);
    if (metric && metric.type === payload.type) {
      metric.observe(payload);
    }
  }
}

const median = (arr: number[]): number => {
  // Create a copy and sort the array in ascending order
  const sortedArr = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);

  if (sortedArr.length % 2 === 0) {
    // If the array length is even, return the average of the two middle elements
    return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
  } else {
    // If the array length is odd, return the middle element
    return sortedArr[mid];
  }
};
