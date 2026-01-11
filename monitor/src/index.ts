// Import only the built-in http module
import * as http from "http";
import os from "os";
import { Monitor } from "./client";

const PORT = 3000;

// Create the server
const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    monitor.recordMetric({
      metric: "request_latency",
      value: 10,
      unit: "ms",
    });

    try {
      // We need a full URL to parse query parameters
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Send the response
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `hello world from monitoring at ${
          process.env.NODE_NAME || os.hostname()
        }`
      );
    } catch (error) {
      console.error("Error handling request:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
);

// Start monitoring
const monitor = new Monitor("monitor");
monitor.start();

// Start listening for requests
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
