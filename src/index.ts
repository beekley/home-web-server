import * as fs from "fs";
import * as path from "path";
import { Home } from "./home";
import { Monitor } from "./monitor";

function build() {
  console.log("Building index.html...");

  // The Home class needs a Monitor instance.
  // The monitor won't have any data, so the graph will show a "collecting data" message.
  const monitor = new Monitor();

  const home = new Home(monitor);
  const htmlContent = home.buildHtml();

  const outputDir = "output";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, "index.html"), htmlContent);

  console.log("Successfully created output/index.html");
}

build();
