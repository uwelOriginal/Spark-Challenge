// Whole-class audio through the real UI and real AI.
// Usage: CLARA_URL=http://localhost:3000 node tests/e2e-long-class.mjs <audio-file> <screenshot-dir>
import { chromium } from "playwright-core";

const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const [audio, out = "."] = process.argv.slice(2);
const t0 = Date.now();
const secs = () => Math.round((Date.now() - t0) / 1000);
const log = [];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE);
await page.locator('.drop input[type="file"]').setInputFiles(audio);
await page.getByText(/Transcribiendo la clase completa|Preparando el audio/).first().waitFor({ timeout: 60_000 });
log.push(`${secs()}s job started`);
await page.waitForTimeout(8000);
await page.screenshot({ path: `${out}/long-1-progress.png`, fullPage: true });

await page.getByText(/momentos sobre tareas en/).waitFor({ timeout: 20 * 60_000 });
log.push(`${secs()}s passages ready: ${await page.getByText(/momentos sobre tareas en/).innerText()}`);
await page.screenshot({ path: `${out}/long-2-passages.png`, fullPage: true });

await page.getByRole("button", { name: /^Agregar \d+ momentos/ }).click();
await page.getByRole("button", { name: "Leer con Clara" }).click();
await page.getByRole("heading", { name: "Qué hacer" }).waitFor({ timeout: 150_000 });
log.push(`${secs()}s decoded: ${await page.locator(".checklist .check").count()} steps`);
await page.screenshot({ path: `${out}/long-3-summary.png`, fullPage: true });
await page.getByText("Fechas, entregables y formato").click();
const deliver = await page.locator('[data-panel="tasks"]').innerText();
log.push(`exam found: ${/17 de noviembre/i.test(deliver)} · essay date found: ${/12 de noviembre/i.test(deliver)} · 1500 words: ${/1[.,]?500/.test(deliver)}`);
await page.screenshot({ path: `${out}/long-4-deliver.png`, fullPage: true });

console.log(log.join("\n"));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
