export interface MetricPayload {
  host: string; // e.g., "rpi-1"
  service: string; // e.g., "living-room-sensor"
  name: string; // e.g., "cpu_temp"
  timestamp: number; // Unix epoch
  type: PointType;
  point: Point;
  fields?: Record<string, string>;
}

export type Point = Counter | Gauge | Histogram;
export type PointType = "counter" | "gauge" | "histogram";

export interface Counter {
  // e.g. "404 response"
}

export interface Gauge {
  // e.g., "cpu_temp"
  value: number; // e.g., 45.2
  unit: string; // e.g., "°C"
}

export interface Histogram {
  // e.g., "request_latency"
  value: number; // e.g., 120
  unit: string; // e.g., "ms"
}
