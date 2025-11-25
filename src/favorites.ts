import { fetchUrl, HtmlPage, htmlTemplate, parseCsvToObject } from "./common";

interface Thing {
  type: string;
  rank: string;
  name: string;
  description: string;
}

export class Favorites implements HtmlPage {
  readonly PATH = "/favorites";
  private readonly cacheTimeMs = 5 * 60 * 1000;

  private things: Thing[] = [];
  private lastFetch?: Date;

  constructor() {
    console.log("Favorites factory ready.");
    this.fetch();
  }

  async fetch() {
    // Debounce
    const now = new Date();
    if (this.lastFetch) {
      const sinceLastFetchMs = now.getTime() - this.lastFetch.getTime();
      if (sinceLastFetchMs < this.cacheTimeMs) {
        console.log(
          `Skiped fetch. Last fetch ${(sinceLastFetchMs / 1000).toFixed(
            0
          )}s ago (${this.lastFetch.toISOString()})`
        );
        return;
      }
    }

    const publicCsvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTxAzBVBWuurUTeL6va0MjZRuqVwpzMme9iOzxJRAjhhG92h-lQ_sclhRMLyw6wIDNUsJBSXZHInzn4/pub?gid=0&single=true&output=csv";
    const csvData = await fetchUrl(publicCsvUrl);
    this.things = parseCsvToObject<Thing>(csvData).filter(
      (thing) => thing.name && thing.name != ""
    );
    this.lastFetch = now;
    console.log("Fetched favorites.");
  }

  buildHtml(): string {
    // Trigger a fetch of new data. Since this is an async operation, we don't wait for it.
    this.fetch();

    // Use a template literal to build the HTML dynamically
    // Uses https://jdan.github.io/98.css/.
    return htmlTemplate(`
      <div class="window" style="margin: 32px; width: 250px">
        <div class="title-bar">
          <div class="title-bar-text">
            Favorite things
          </div>

          <div class="title-bar-controls">
            <button aria-label="Close"></button>
          </div>
        </div>
        <div class="window-body">
          <p>Hello, world!</p>
          <p>${this.things.length} things.</p>
          <section class="field-row" style="justify-content: flex-end">
            <button>OK</button>
            <button>Cancel</button>
          </section>
        </div>
      </div>
    `);
  }
}
