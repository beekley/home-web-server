import {
  Histogram as ClientHistogram,
  MetricPayload,
  PointType,
} from "./client";

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

export class Histogram extends Metric {
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
    const point = payload.point as ClientHistogram;
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
      points: this.recentValues, // The SVG was showing raw points, not buckets
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
          new Histogram(payload.name, {
            unit: (payload.point as ClientHistogram).unit,
          })
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

interface SvgData {
  yLabel: string;
  xLabel: string;
  points: number[];
  title: string;
}

export function renderSvg(
  data: SvgData,
  width: number = 800,
  height: number = 150,
  lineColors: string[] = ["#0074d9", "#82b7e5ff"],
  fillColor: string = "rgba(0, 116, 217, 0.1)"
): string {
  if (data.points.length < 2) {
    return `<div style="text-align:center; padding: 20px; color: #666;">Not enough data to render SVG.</div>`;
  }
  const maxVal = Math.max(...data.points);

  const stepX = width / (data.points.length - 1);

  // Generate Points for the primary line
  const points = data.points
    .map((pt, i) => {
      const x = i * stepX;
      const y = height - (pt / maxVal) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // 3. Return SVG String
  return `
    <summary>
    <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 5px;">${
      data.title
    }</div>
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" style="background: #f8f9fa; border-radius: 2px; border: 1px solid #e9ecef;">
        <!-- Grid Lines (Optional) -->
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${
    height * 0.25
  }" stroke="#e9ecef" stroke-width="1" />
        <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${
    height * 0.5
  }" stroke="#e9ecef" stroke-width="1" />
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${
    height * 0.75
  }" stroke="#e9ecef" stroke-width="1" />

        <!-- The Data Fill -->
        <polygon points="0,${height} ${points} ${width},${height}" fill="${fillColor}" />
        
        <!-- The Data Line -->
        <polyline points="${points}" fill="none" stroke="${
    lineColors[0]
  }" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
    </summary>
    `;
}
