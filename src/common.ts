import https from "https";

export function htmlTemplate(content: string): string {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dynamic Node.js Server</title>
          <link
            rel="stylesheet"
            href="https://unpkg.com/98.css"
          >
          <style>
            body { zoom: 1.25; } /* Adjust this value as needed */
            main {
              display: flex;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <main>
            ${content}
          </main>
        </body>
        </html>
      `;
}

export interface HtmlPage {
  readonly PATH: string;
  buildHtml(): string;
}

// Helper: Fetch URL content (Zero-dependency)
export function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Handle Redirects (301, 302, 307, etc.)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }

        // Handle Non-200 Errors
        if (res.statusCode && res.statusCode !== 200) {
          reject(
            new Error(`Request failed with status code ${res.statusCode}`)
          );
          res.resume(); // Consume response data to free up memory
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// Helper: Parse CSV (Zero-dependency)
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'; // Handle escaped quotes
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      if (char === "\r" && nextChar === "\n") i++;
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows;
}

export function parseCsvToObject<T>(csvText: string): T[] {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const data = rows.slice(1);

  return data.map((row) => {
    const obj: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj as T;
  });
}
