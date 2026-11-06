// Relative dates, reminders, install and Canvas, with real AI.
// Usage: CLARA_URL=http://localhost:3005 node tests/e2e-reminders.mjs <screenshot-dir>
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const SHOTS = process.argv[2] ?? os.tmpdir();
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = IPHONE.replace("Version/18.1", "CriOS/131.0.0.0");
const INSTAGRAM = `${ANDROID} Instagram 300.0.0.0`;

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failed++;
};
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const NEW_TASK = /nueva|Nueva|Otra tarea/;
const browser = await chromium.launch({ channel: "chrome" });

// Install button
for (const [label, userAgent, expectText] of [
  ["Android Chrome, before the browser is ready", ANDROID, "menú del navegador"],
  ["iPhone Safari", IPHONE, "Compartir"],
  ["iPhone Chrome", IPHONE_CHROME, "Compartir"],
  ["inside Instagram", INSTAGRAM, "Abrir en Chrome"],
]) {
  const ctx = await browser.newContext({ userAgent, viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE);
  const btn = page.getByRole("button", { name: "Instalar" });
  await btn.waitFor({ timeout: 8000 });
  check(`${label}: button has visible text`, await btn.getByText("Instalar").isVisible());
  await btn.click();
  const text = await page.locator(".install-help").innerText();
  check(`${label}: shows the right steps`, text.includes(expectText), text.slice(0, 60));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(`${label}: no sideways scroll at 360px`, !overflow);
  if (label.startsWith("iPhone Safari")) await page.screenshot({ path: path.join(SHOTS, "install-ios.png") });
  if (label.startsWith("Android")) await page.screenshot({ path: path.join(SHOTS, "install-android-menu.png") });
  await ctx.close();
}

// native dialog on Android once Chrome offers it
{
  const ctx = await browser.newContext({ userAgent: ANDROID, viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole("button", { name: "Instalar" }).waitFor();
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => { window.__prompted = true; };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(e);
  });
  await page.getByRole("button", { name: "Instalar" }).click();
  await page.waitForTimeout(200);
  check("Android: one tap opens the browser's dialog", await page.evaluate(() => window.__prompted === true));
  check("Android: button goes away after installing", (await page.getByRole("button", { name: "Instalar" }).count()) === 0);
  await ctx.close();
}

// Installable according to Chrome
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clara-e2e-"));
const ctx = await chromium.launchPersistentContext(dir, { channel: "chrome", viewport: { width: 420, height: 800 }, permissions: ["notifications"] });
const page = ctx.pages()[0] ?? (await ctx.newPage());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(BASE);
await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.getRegistration());
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const inst = await cdp.send("Page.getInstallabilityErrors");
check("Chrome reports no installability errors", inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors).slice(0, 200));
const man = await cdp.send("Page.getAppManifest");
check("Manifest parsed with no errors", man.errors.length === 0, JSON.stringify(man.errors).slice(0, 200));

// "Tarea para mañana"
// also stop on Clara's error message instead of timing out
const readDone = async () => {
  await page.locator(".work-head, .notice-warn").first().waitFor({ timeout: 120000 });
  const warn = page.locator(".notice-warn");
  if (await warn.count()) throw new Error(`Clara could not read the material: ${await warn.first().innerText()}`);
};
await page.getByRole("button", { name: /Pegar/ }).click();
await page.locator("#material-text").fill("Hay tarea para mañana: leer el capítulo 3 del libro de Biología y contestar las preguntas de la página 40. Se entrega al inicio de la clase.");
await page.getByRole("button", { name: "Agregar", exact: true }).click();
await page.getByRole("button", { name: /Leer con Clara/ }).click();
await readDone();
const head = await page.locator(".work-head").innerText();
check('"mañana" does not end up as "Sin fecha clara"', !head.includes("Sin fecha clara"), head.replace(/\s+/g, " ").slice(0, 110));
check("the header says tomorrow", head.includes("Mañana"));
check("add-to-calendar button is there", await page.getByRole("button", { name: /Agregar a mi calendario/ }).isVisible());
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("clara.v3")).assignments[0].decode.deadlines);
check("the stored date is tomorrow", stored.some((d) => d.date === day(1)), JSON.stringify(stored.map((d) => [d.when, d.date])));
check("the student is told the date was worked out", await page.getByText("Clara calculó la fecha").first().isVisible());
await page.screenshot({ path: path.join(SHOTS, "tomorrow.png") });

// vague phrase stays a question
await page.locator(".brand").click();
await page.getByRole("button", { name: NEW_TASK }).click();
await page.getByRole("button", { name: /Pegar/ }).click();
await page.locator("#material-text").fill("Para la próxima semana hay que entregar un resumen del capítulo 5 del libro de Historia, de una página, en PDF.");
await page.getByRole("button", { name: "Agregar", exact: true }).click();
await page.getByRole("button", { name: /Leer con Clara/ }).click();
await readDone();
const vague = await page.locator(".work-head").innerText();
check('"la próxima semana" is not given an invented date', vague.includes("Sin fecha clara"), vague.replace(/\s+/g, " ").slice(0, 110));
await page.locator('.date-pick input[type="date"]').first().fill(day(4));
await page.waitForTimeout(300);
check("choosing a date by hand brings the calendar button", await page.getByRole("button", { name: /Agregar a mi calendario/ }).isVisible());
await page.screenshot({ path: path.join(SHOTS, "date-picked.png") });

// Settings
await page.getByRole("button", { name: /Ajustes/ }).click();
check("Settings has the Canvas link field", await page.locator("#feed").isVisible());
check("Settings has add-all-dates for the calendar", await page.getByRole("button", { name: /Agregar todas mis fechas/ }).isVisible());
const onBtn = page.getByRole("button", { name: "Activar notificaciones" });
await onBtn.waitFor({ timeout: 8000 });
await onBtn.click();
const result = await Promise.race([
  page.getByRole("button", { name: /Probar: llega/ }).waitFor({ timeout: 25000 }).then(() => "on"),
  page.getByText("No pudimos activar").waitFor({ timeout: 25000 }).then(() => "failed"),
]).catch(() => "timeout");
check("notifications turn on", result === "on", result);
if (result === "on") {
  const scheduled = await page.getByText(/recordatorios? programados?/).innerText();
  check("reminders are scheduled", /\d/.test(scheduled) && !scheduled.includes(" 0 "), scheduled);
  const sub = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).pushManager.getSubscription())?.endpoint ?? "");
  console.log("      push service:", new URL(sub).hostname);
  await page.screenshot({ path: path.join(SHOTS, "notifications-on.png"), fullPage: false });

  // real path through Google's push service
  const shown = page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 60; i++) {
      const list = await reg.getNotifications();
      if (list.length) return { title: list[0].title, body: list[0].body, icon: list[0].icon };
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  });
  await page.getByRole("button", { name: /Probar: llega/ }).click();
  const sentNote = await page.getByText(/Enviada\.|No pudimos activar/).first().waitFor({ timeout: 25000 }).then(() => page.getByText(/Enviada\.|No pudimos activar/).first().innerText());
  check("the server sent a real push", sentNote.startsWith("Enviada"), sentNote.slice(0, 50));
  const n = await shown;
  check("a real notification appeared on this device", !!n, JSON.stringify(n));
  if (n) check("it shows the reminder text from the device, not generic text", n.title.includes("Recordatorio"), n.title);
}

// due reminder, sent by the server's clock
if (result === "on") {
  const fired = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (const n of await reg.getNotifications()) n.close();
    const sub = await reg.pushManager.getSubscription();
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", subscription: sub.toJSON(), reminders: [{ id: "test", at: Date.now() + 3000 }], lang: "es" }) });
    for (let i = 0; i < 100; i++) {
      if ((await reg.getNotifications()).length) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  });
  check("a scheduled reminder fires from the server's clock", fired);
}

const blocked = await page.evaluate(async () => (await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", reminders: [], subscription: { endpoint: "https://169.254.169.254/latest", keys: { p256dh: "x", auth: "y" } } }) })).status);
check("the server refuses a push address that is not a push service", blocked === 400, String(blocked));
const blockedFeed = await page.evaluate(async () => (await fetch("/api/canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://localhost/feeds/calendars/user_x.ics" }) })).status);
check("the Canvas route refuses internal addresses", blockedFeed === 400, String(blockedFeed));

// Canvas
await page.locator(".brand").click();
await page.getByRole("button", { name: NEW_TASK }).click();
await page.getByRole("button", { name: "Canvas" }).click();
await page.getByRole("button", { name: "Usar Canvas de ejemplo" }).click();
await page.getByRole("heading", { name: "Elige una tarea" }).waitFor({ timeout: 15000 });
await page.locator(".intake .row-card").first().click();
const canvasText = await page.locator("#material-text").inputValue();
check("Canvas: picking a task brings its text with the date", canvasText.includes("Fecha en Canvas") && canvasText.length > 40, canvasText.slice(0, 70).replace(/\n/g, " "));
await page.screenshot({ path: path.join(SHOTS, "canvas.png") });

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 200));
await ctx.close();
await browser.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
