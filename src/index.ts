import * as fs from "fs";
import * as path from "path";
import { Home } from "./home";
import { Monitor } from "./monitor";
import { Favorites } from "./favorites";
import { HtmlPage } from "./common";

const OUTPUT_DIR = "output";

function build(factory: HtmlPage) {
  console.log(`Building ${factory.FILENAME}...`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${factory.FILENAME}.html`),
    factory.buildHtml()
  );

  console.log(`Successfully created output/${factory.FILENAME}.html`);
}

const monitor = new Monitor();
build(new Home(monitor));
build(new Favorites());
