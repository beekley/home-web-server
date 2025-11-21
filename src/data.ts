import path from "path";
import fs from "fs";
import os from "os";

const DATA_FILE = path.join(__dirname, "../logs/stats.json");
const MAX_POINTS = 1440; // 24 hours * 60 minutes

let data: DataPoint[] = [];

export const getData = () => {
  console.log(data);
  return data;
};

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

interface DataPoint {
  timestamp: string;
  cpuUtilization: number;
  ramUtilization: number;
  ramUsageBytes: number;
}

export const log = () => {
  // Read existing
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading stats", e);
  }

  // Add new point
  data.push({
    timestamp: new Date().toISOString(),
    cpuUtilization: getCpuUtilization(),
    ramUtilization: getRam().usedMemory / getRam().totalMemory,
    ramUsageBytes: getRam().usedMemory,
  });

  // Trim to last 24h
  if (data.length > MAX_POINTS) {
    data = data.slice(data.length - MAX_POINTS);
  }

  // Write (Atomic-ish write recommended for production, but this is fine for simple use)
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
};

const getRam = () => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return { totalMemory, freeMemory, usedMemory };
};

const getCpuUtilization = (): number => {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((total, cpu) => {
    const idle = cpu.times.idle;
    return total + idle;
  }, 0);
  const totalTick = cpus.reduce((total, cpu) => {
    const tick =
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq;
    return total + tick;
  }, 0);

  return 1 - totalIdle / totalTick;
};
