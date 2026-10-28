// End-to-end flow with REAL AI calls on a running server (npm run build && npm start).
// Drives the phone layout: example → decode → every tab → chat → new version → calendar → Canvas demo.
// Usage: CLARA_URL=http://localhost:3005 node tests/e2e-flow.mjs <screenshot-dir>
import { chromium } from "playwright-core";

const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const report = { steps: [], pageErrors: [] };
const step = (name, ok, detail = "") => report.steps.push({ name, ok, detail });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => report.pageErrors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, fullPage: true });

await page.goto(BASE);
await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
await page.getByText(/Clara comprobó \d+ de \d+ datos/).waitFor({ timeout: 150_000 });
step("example decoded", true, await page.getByText(/Clara comprobó/).innerText());
await shot("m01-summary");

const contradiction = await page.locator(".pill-contradiction").count();
step("cross-source contradiction shown in sources panel", contradiction > 0, `${contradiction}`);

for (const [tab, file] of [["Entregar", "m02-deliver"], ["Dudas", "m03-unclear"], ["Pasos", "m04-steps"], ["Calendario", "m06-calendar"], ["Mentor", "m08-mentor"]]) {
  await page.locator(".tabs").getByRole("button", { name: new RegExp(`^${tab}`) }).click();
  await shot(file);
}

// Unclear: the professor message reflects the questions
await page.locator(".tabs").getByRole("button", { name: /^Dudas/ }).click();
const msg = await page.getByLabel("Mensaje para tu profesor/a").inputValue();
step("professor message drafted", /Estimado\/a/.test(msg) && /\d\. /.test(msg));

// Chat grounded in sources
await page.locator(".tabs").getByRole("button", { name: /^Pregúntale/ }).click();
await page.getByRole("button", { name: "¿Cuántas palabras debe tener?" }).click();
await page.locator(".msg-assistant").last().getByText(/./).first().waitFor({ timeout: 90_000 });
await page.waitForFunction(() => !document.body.innerText.includes("Clara está buscando en tus fuentes"), null, { timeout: 90_000 });
const answer = await page.locator(".msg-assistant").last().innerText();
step("chat answers from the class transcript", /1[.,]?500/.test(answer), answer.slice(0, 160).replace(/\n/g, " "));
await shot("m05-chat");

// Calendar events exist
await page.locator(".tabs").getByRole("button", { name: /^Calendario/ }).click();
const events = await page.locator(".event-row").count();
step("calendar events planned", events >= 2, `${events} events`);

// New version → changes
await page.locator(".tabs").getByRole("button", { name: /^Cambios/ }).click();
await page.getByRole("button", { name: "Usar la versión nueva del ejemplo" }).click();
await page.getByRole("button", { name: "Agregar y comparar" }).click();
await page.getByRole("heading", { name: "Qué cambió" }).first().waitFor({ timeout: 150_000 });
const changeText = await page.locator(".tab-panel").innerText();
step("change translator finds the moved date", /16/.test(changeText));
await shot("m07-changes");

// Today and list
await page.locator(".bottombar").getByRole("button", { name: "Hoy" }).click();
await shot("m00-today");
await page.locator(".bottombar").getByRole("button", { name: "Tareas" }).click();
await shot("m09-list");

// New: Canvas demo import lists assignments
await page.locator(".bottombar").getByRole("button", { name: "Nueva" }).click();
await page.getByRole("button", { name: "Desde Canvas" }).click();
await page.getByRole("button", { name: "Usar Canvas de ejemplo" }).click();
await page.getByText("Elige una tarea").waitFor({ timeout: 30_000 });
step("Canvas demo feed lists assignments", (await page.locator(".panel-inner .row-card").count()) === 3);
await shot("m10-new-canvas");

// Settings
await page.locator(".bottombar").getByRole("button", { name: "Ajustes" }).click();
await shot("m11-settings");

// Desktop views
await page.setViewportSize({ width: 1440, height: 900 });
await page.locator(".sidebar").getByRole("button", { name: "Hoy" }).click();
await shot("d00-today");
await page.locator(".sidebar").getByRole("button", { name: "Tareas" }).click();
await page.locator(".list-rows .row-card").first().click();
await shot("d01-summary");

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
step("no horizontal overflow on desktop", !overflow);
await browser.close();
console.log(JSON.stringify(report, null, 2));
