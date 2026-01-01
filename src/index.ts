import * as fs from "fs";
import * as path from "path";
import { Home } from "./home";
import { Monitor } from "./monitor";
import { Favorites } from "./favorites";
import { HtmlPage } from "./common";

const OUTPUT_DIR = "output";

async function build(factory: HtmlPage) {
  console.log(`Building ${factory.FILENAME}...`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${factory.FILENAME}.html`),
    await factory.buildHtml()
  );

  console.log(`Successfully created output/${factory.FILENAME}.html`);
}

async function main() {
  const monitor = new Monitor();
  await build(new Home(monitor));
  await build(new Favorites());
}

main();
