// Import only the built-in http module
import * as http from "http";
import os from "os";
import { MetricPayload, Monitor } from "./client";
import { storage, storeBatch } from "./storage";

const PORT = 3000;

// Create the server
const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    const start = performance.now();

    try {
      // We need a full URL to parse query parameters
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Home
      if (url.pathname === "/") {
        // Send the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `hello world from monitoring at ${
            process.env.NODE_NAME || os.hostname()
          }\n` +
            Object.values(storage)
              .map((s) => s.summary())
              .join("\n")
        );
      }

      // Post metrics
      else if (url.pathname === "/metric" && req.method === "POST") {
        const body: Buffer[] = [];

        req.on("data", (chunk) => {
          body.push(chunk);
        });

        req.on("end", () => {
          const data: MetricPayload[] = JSON.parse(
            Buffer.concat(body).toString()
          );
          if (!Array.isArray(data)) {
            throw new Error("Payload must be an array");
          }

          storeBatch(data);

          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(`Metrics received: ${data}`);
        });
      }

      // 404
      else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    } catch (error) {
      console.error("Error handling request:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }

    monitor.recordMetric(
      {
        value: performance.now() - start,
        unit: "ms",
      },
      "request_latency",
      "histogram"
    );
  }
);

// Start monitoring
const monitor = new Monitor("monitor");
monitor.start();

// Start listening for requests
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
