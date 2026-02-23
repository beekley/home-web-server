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
  private readonly buckets: number[];
  private readonly bucketCounts: number[];
  private sum: number = 0;
  private count: number = 0;
  private unit: string;

  // To keep track of recent values for rendering, similar to old implementation.
  private readonly recentValues: number[] = [];
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

    if (this.recentValues.length >= this.BUFFER_SIZE) {
      this.recentValues.shift();
    }
    this.recentValues.push(value);

    if (this.unit === "" && point.unit) {
      this.unit = point.unit;
    }
  }

  summary(): string {
    return renderSvg({
      xLabel: `Latency (${this.unit})`,
      yLabel: "Distribution",
      series: [this.recentValues], // The SVG was showing raw points, not buckets
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
    return `${this.name} (gauge): ${this.values.length} points`;
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
