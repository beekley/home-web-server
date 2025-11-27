import os from "os";
import dns from "dns/promises";

interface DataPoint {
  timestamp: string;
  cpuUtilization: number;
  ramUtilization: number;
  ramUsageBytes: number;
}

export class Monitor {
  data: DataPoint[] = [];

  static PATH = "/monitorz";

  private interval?: ReturnType<typeof setTimeout>;

  // This matches the Headless Service Name
  private static readonly TARGET_SERVICE =
    "home-web-server-discovery.default.svc.cluster.local";
  private INTERVAL_SECS: number;
  private MAX_POINTS: number;

  // Store previous CPU times to calculate utilization over the interval
  private previousCpuTimes: { idle: number; total: number };

  constructor(intervalSecs: number = 60, maxPoints: number = 60 * 24) {
    this.INTERVAL_SECS = intervalSecs;
    this.MAX_POINTS = maxPoints;

    this.previousCpuTimes = Monitor.getCpuTimes();
  }

  start() {
    this.interval = setInterval(() => {
      this.log();
    }, this.INTERVAL_SECS * 1000);
    console.log(`Monitoring started and available at ${Monitor.PATH}.`);
  }

  stop() {
    clearTimeout(this.interval);
  }

  private log() {
    // Add new point
    this.data.push({
      timestamp: new Date().toISOString(),
      cpuUtilization: this.getCpuUtilization(),
      ramUtilization: this.getRam().usedMemory / this.getRam().totalMemory,
      ramUsageBytes: this.getRam().usedMemory,
    });

    // Trim to last 24h
    if (this.data.length > this.MAX_POINTS) {
      this.data = this.data.slice(this.data.length - this.MAX_POINTS);
    }
  }

  // --- SVG Generator (Zero Dependency) ---
  renderSvg(width: number = 800, height: number = 150): string {
    if (this.data.length < 2)
      return `<div style="text-align:center; padding: 20px; color: #666;">Collecting data. Please refresh in ${this.INTERVAL_SECS}s.</div>`;

    // 1. Config
    const maxVal = 1;
    const stepX = width / (this.data.length - 1);

    // TODO: Normalize this so it aligns with the data below
    this.getOtherNodeData();

    // 2. Generate Points
    // SVG Coordinates: (0,0) is top-left. We must invert Y (height - val).
    const points = this.data
      .map((pt, i) => {
        const x = i * stepX;
        const y = height - (pt.cpuUtilization / maxVal) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // TODO: replace with fetched data from other nodes
    const points2 = this.data
      .map((pt, i) => {
        const x = i * stepX;
        const y = height - (pt.ramUtilization / maxVal) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // 3. Return SVG String
    // - Polyline: The actual graph line
    // - Polygon: The semi-transparent fill under the line
    return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" style="background: #f8f9fa; border-radius: 2px; border: 1px solid #e9ecef;">
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
        <polygon points="0,${height} ${points} ${width},${height}" fill="rgba(0, 116, 217, 0.1)" />
        
        <!-- The Data Line -->
        <polyline points="${points}" fill="none" stroke="#0074d9" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- The Data Line -->
        <polyline points="${points2}" fill="none" stroke="#82b7e5ff" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 4px;">
      <span>${this.formatDuration(this.INTERVAL_SECS * this.data.length)}</span>
      <span>CPU Util: ${(
        this.data[this.data.length - 1].cpuUtilization * 100
      ).toFixed(0)}%</span>
    </div>
    `;
  }

  private async getOtherNodeData(): Promise<DataPoint[][]> {
    let ips: string[] = [];
    try {
      ips = await dns.resolve4(Monitor.TARGET_SERVICE);
    } catch (err) {
      console.error(
        `Could not resolve IPs for other nodes at ${Monitor.TARGET_SERVICE}:`,
        err
      );
      return [];
    }
    console.log({ ips });

    const allNodesData: DataPoint[][] = [];
    for (const ip of ips) {
      try {
        // TODO: make port dynamic.
        const response = await fetch(`http://${ip}:3000${Monitor.PATH}`);
        const data = await response.json();
        allNodesData.push(data);
      } catch (err) {
        console.error(`Could not fetch data from node ${ip}:`, err);
      }
    }
    console.log({ allNodesData });
    return allNodesData;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(0)}m`;
    } else {
      return `${(seconds / 3600).toFixed(0)}h`;
    }
  }

  private getRam(): {
    totalMemory: number;
    freeMemory: number;
    usedMemory: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return { totalMemory, freeMemory, usedMemory };
  }

  private static getCpuTimes(): { idle: number; total: number } {
    const cpus = os.cpus();

    let currentIdle = 0;
    let currentTotal = 0;

    for (const cpu of cpus) {
      currentIdle += cpu.times.idle;
      currentTotal +=
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.idle +
        cpu.times.irq;
    }

    return { idle: currentIdle, total: currentTotal };
  }

  // This method calculates CPU utilization since the last call.
  // It stores the previous CPU times to compare with current times.
  private getCpuUtilization(): number {
    const { idle: currentIdle, total: currentTotal } = Monitor.getCpuTimes();

    const idleDifference = currentIdle - this.previousCpuTimes.idle;
    const totalDifference = currentTotal - this.previousCpuTimes.total;

    this.previousCpuTimes = { idle: currentIdle, total: currentTotal };

    if (totalDifference === 0) return 0; // Avoid division by zero

    return 1 - idleDifference / totalDifference;
  }
}
