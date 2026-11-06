// Renders every docs/diagrams/*.mmd to .svg and .png with Mermaid in the local Chrome.
// Usage from the repo root: node docs/diagrams/render.mjs   (needs clara/node_modules, run npm install there first)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../clara/package.json"))("playwright-core");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 2 });
await page.setContent("<!doctype html><html><body style='margin:0;background:#fff'><div id='o' style='display:inline-block;padding:16px'></div></body></html>");
await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js" });
await page.evaluate(() =>
  window.mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict", flowchart: { htmlLabels: false, useMaxWidth: false }, sequence: { useMaxWidth: false } }),
);

for (const file of fs.readdirSync(here).filter((f) => f.endsWith(".mmd")).sort()) {
  const code = fs.readFileSync(path.join(here, file), "utf8");
  const id = "d" + file.replace(/\W/g, "");
  const svg = await page.evaluate(
    async ({ id, code }) => {
      const { svg } = await window.mermaid.render(id, code);
      document.getElementById("o").innerHTML = svg;
      return svg;
    },
    { id, code },
  );
  const base = path.join(here, file.replace(/\.mmd$/, ""));
  fs.writeFileSync(`${base}.svg`, svg);
  await page.locator("#o").screenshot({ path: `${base}.png` });
  console.log("rendered", file);
}
await browser.close();
