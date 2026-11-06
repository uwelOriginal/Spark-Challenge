// PWA icons, rendered with system Chrome. Run: node eval/make-icons.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const wave = (stroke) =>
  `<path d="M5 19c3.2-4.4 6.4-4.4 9.6 0s6.4 4.4 9.6 0c1-1.4 1.9-2.3 2.8-2.7" fill="none" stroke="#1E4FA3" stroke-width="${stroke}" stroke-linecap="round"/>`;
const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#FFC700"/>${wave(2.6)}</svg>`;
// maskable: wave stays inside the 80% safe zone
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#FFC700"/><g transform="translate(3.2 3.2) scale(0.8)">${wave(2.6)}</g></svg>`;

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, svg, size] of [
  ["icon-192.png", round, 192],
  ["icon-512.png", round, 512],
  ["icon-maskable-512.png", maskable, 512],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(out, name), omitBackground: true });
  await page.close();
}
await browser.close();
console.log("icons written to", out);
