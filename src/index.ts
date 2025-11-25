// Import only the built-in http module
import * as http from "http";
import { Home } from "./home";
import { Monitor } from "./monitor";
import { Favorites } from "./favorites";

const PORT = 3000;

// Create the server
const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      // We need a full URL to parse query parameters
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Basic routing
      if (url.pathname === home.PATH) {
        // Send the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(home.buildHtml());
      } else if (url.pathname === favorites.PATH) {
        // Send the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(favorites.buildHtml());
      } else if (url.pathname === Monitor.PATH) {
        // Send the monitoring data.
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(monitor.data));
      } else {
        // Handle 404 Not Found
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
    } catch (error) {
      console.error("Error handling request:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
);

// Start listening for requests
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

// Start monitoring
const monitor = new Monitor(1 /* seconds */);
monitor.start();

// Prepare homepage
const home = new Home(monitor);

// Prepare homepage
const favorites = new Favorites();
