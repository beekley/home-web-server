import os from "os";

const MON_HOST =
  process.env.MON_HOST || "monitor.home-web-server.svc.cluster.local";
const MON_INTERVAL = 10 * 1000; // 10 s.

interface MetricPayload {
  host: string; // e.g., "rpi-1"
  service: string; // e.g., "living-room-sensor"
  timestamp: number; // Unix epoch
  point: Point;
}

export interface Point {
  metric: string; // e.g., "cpu_temp", "request_latency"
  value: number; // e.g., 45.2, 120
  unit: string; // e.g., "°C", "ms"
}

export class Monitor {
  private readonly host: string = process.env.NODE_NAME || os.hostname();
  private buffer: MetricPayload[] = [];
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  public start(): void {
    setInterval(async () => await this.flushBuffer(), MON_INTERVAL);
  }

  public recordMetric(point: Point): void {
    this.buffer.push({
      host: this.host,
      service: this.service,
      timestamp: Date.now(),
      point,
    });
  }

  private async flushBuffer(): Promise<void> {
    const url = `http://${MON_HOST}/metric`;

    const currentBuffer: MetricPayload[] = [];
    while (this.buffer.length > 0) {
      currentBuffer.push(this.buffer.pop()!);
    }

    console.log("POSTING", url, currentBuffer);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentBuffer),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to record metric. Server responded with status: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error sending metric to monitor:", error);
      // Replace the unsuccessfully sent payloads.
      this.buffer.push(...currentBuffer);
    }
  }
}
