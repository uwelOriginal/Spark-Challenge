// Full student path with real AI, on a running server.
// Usage: CLARA_URL=http://localhost:3005 node tests/e2e-flow.mjs <screenshot-dir>
import fs from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const samples = JSON.parse(fs.readFileSync(new URL("../src/samples/briefs.json", import.meta.url), "utf8"));
const newVersion = samples.briefs.find((b) => b.id === "etica_v2").text;
const report = { steps: [], pageErrors: [] };
const step = (name, ok, detail = "") => report.steps.push({ name, ok, detail });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => report.pageErrors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, fullPage: true });
const idle = () => page.waitForFunction(() => !document.querySelector(".chat .notice:not(.notice-warn)"), null, { timeout: 150_000 });

// 1. Upload
await page.goto(BASE);
step("dark theme by default", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
await shot("m00-upload");
await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
await page.getByRole("heading", { name: "Qué hacer" }).waitFor({ timeout: 150_000 });

// 2. Work: tasks
step("example decoded into steps", (await page.locator(".checklist .check").count()) > 0);
step("cross-source contradiction flagged", (await page.getByText(/Tus fuentes no coinciden/).count()) > 0);
await shot("m01-tasks");

// 2. Work: chat (same screen, switch on phones)
await page.getByRole("button", { name: "Chat", exact: true }).click();
await page.getByRole("button", { name: "¿Cuántas palabras debe tener?" }).click();
await page.locator(".msg-assistant").first().waitFor({ timeout: 90_000 });
await idle();
const answer = await page.locator(".msg-assistant").last().innerText();
step("chat answers from the class transcript", /1[.,]?500/.test(answer), answer.slice(0, 160).replace(/\n/g, " "));

// New material from the chat → "what changed" note
await page.getByRole("button", { name: "Agregar material" }).click();
await page.getByRole("button", { name: "Pegar texto" }).click();
await page.getByLabel("Texto").fill(newVersion);
await page.getByRole("button", { name: "Agregar", exact: true }).click();
await page.locator(".msg-update").waitFor({ timeout: 150_000 });
step("change note finds the moved date", /16/.test(await page.locator(".msg-update").innerText()));
await shot("m02-chat");

// 3a. Professor
await page.getByRole("button", { name: /^Preguntar al profesor/ }).click();
const msg = await page.getByRole("textbox", { name: "Tu mensaje" }).inputValue();
step("professor message drafted", /Estimado\/a/.test(msg) && /\d\. /.test(msg));
await shot("m03-teacher");

// 3b. Finish
await page.getByRole("button", { name: "Volver a trabajar" }).click();
await page.getByRole("button", { name: "Terminar" }).click();
await page.getByRole("button", { name: "Marcar como terminada" }).click();
step("assignment finished", (await page.getByText(/Terminada el/).count()) > 0);
await shot("m04-finish");

// Settings: a preference applies at once
await page.getByRole("button", { name: /Ajustes/ }).click();
await page.getByLabel("Alto contraste").check();
step("theme switches live", (await page.evaluate(() => document.documentElement.dataset.theme)) === "contrast");
await shot("m05-settings");
await page.getByLabel("Oscuro").check();

// Desktop: tasks and chat side by side
await page.setViewportSize({ width: 1440, height: 900 });
await page.getByRole("button", { name: /Mis tareas/ }).first().click();
await page.getByText(/Terminadas/).click();
await page.locator(".row-card").first().click();
const both = await page.evaluate(() => [...document.querySelectorAll("[data-panel]")].every((p) => p.getBoundingClientRect().width > 0));
step("tasks and chat visible together on desktop", both);
await shot("d01-work");

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
step("no horizontal overflow on desktop", !overflow);
await browser.close();
console.log(JSON.stringify(report, null, 2));
