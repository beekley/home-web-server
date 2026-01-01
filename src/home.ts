import { Monitor } from "./monitor";
import { HtmlPage, htmlTemplate } from "./common";

export class Home implements HtmlPage {
  readonly FILENAME: string = "index";

  private monitor: Monitor;

  constructor(monitor: Monitor) {
    this.monitor = monitor;
    console.log("Homepage factory ready.");
  }

  async buildHtml(): Promise<string> {
    // Use a template literal to build the HTML dynamically
    // Uses https://jdan.github.io/98.css/.
    // TODO: replace the JS window.open with real links.
    return htmlTemplate(`
      <div class="window" style="margin: 32px; width: 250px">
        <div class="title-bar">
          <div class="title-bar-text">
            Brett Beekley
          </div>
        </div>
        <div class="window-body">
          <p>Hello, world! Welcome to my Web Site.</p>
          <section class="field-row" style="justify-content: flex-end">
            <button onclick="window.open('https://github.com/beekley/', '_blank')">Github</button>
            <button onclick="window.open('https://www.linkedin.com/in/brettbeekley/', '_blank')">Linkedin</button>
            <button onclick="window.open('https://blog.beekley.xyz/', '_blank')">Blog</button>
          </section>
        </div>
      </div>
      <div class="window" style="margin: 32px; width: 250px">
        <div class="title-bar">
          <div class="title-bar-text">
            Favorites
          </div>
        </div>
        <div class="window-body">
          <p>These are a few of my favorite things. A glimpse into who I am!</p>
          <section class="field-row" style="justify-content: flex-end">
            <button onclick="window.open('/favorites.html', '_blank')">All-time</button>
            <button onclick="window.open('https://music.beekley.xyz/', '_blank')">Music Graph</button>
          </section>
        </div>
      </div>
    `);
  }
}

// Currently unused.
// <div class="window" style="margin: 32px; width: 250px">
//   <div class="title-bar">
//     <div class="title-bar-text">
//       Infrastructure
//     </div>
//   </div>
//   <div class="window-body">
//     <p>This HTML is built dynamically and served by a k3s cluster of Rasperry Pis and Pi-like devices.</p>
//     ${this.monitor.renderSvg()}
//     <br/>
//     <section class="field-row" style="justify-content: flex-end">
//       <button onclick="window.open('https://github.com/beekley/home-web-server', '_blank')">Project Github</button>
//     </section>
//   </div>
