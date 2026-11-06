// Studio with real AI: theme, chat analogies, settings proposals, theme switch.
// Usage: CLARA_URL=http://localhost:3005 node tests/e2e-studio.mjs <screenshot-dir>
import { chromium } from "playwright-core";

const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const report = { steps: [], pageErrors: [] };
const step = (name, ok, detail = "") => report.steps.push({ name, ok, detail });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => report.pageErrors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, fullPage: true, animations: "disabled" });
const html = (k) => page.evaluate((key) => document.documentElement.dataset[key], k);
const chatIdle = () => page.waitForFunction(() => !document.querySelector(".chat .notice:not(.notice-warn)"), null, { timeout: 150_000 });

await page.goto(BASE);
await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
await page.locator(".checklist .check").first().waitFor({ timeout: 150_000 });

// 1. Interest card → football
step("interest card offered", await page.locator(".interest-card").isVisible());
await shot("s00-interest-card");
await page.locator(".interest-card").getByRole("button", { name: "Fútbol" }).click();
step("board drawn at once", await page.locator(".board .stop").first().isVisible());
await page.waitForFunction(() => document.querySelector(".group-label") || document.querySelector(".studio .notice-warn"), null, { timeout: 150_000 });
const failed = await page.locator(".studio .notice-warn").count();
step("theme generated", failed === 0, failed ? await page.locator(".studio .notice-warn").innerText() : "");
const stops = await page.locator(".board .stop:not(.stop-finish)").count();
const checks = await page.locator(".groups .check").count();
step("every step is on the board and in a group", stops > 0 && stops === checks, `${stops} stops, ${checks} grouped steps`);
step("pack chosen", /Fútbol/.test(await page.locator("#studio-h").innerText()), await page.locator("#studio-h").innerText());
step("analogies with limits", (await page.locator(".analogy").count()) > 0 && (await page.getByText("Dónde no encaja").count()) > 0, `${await page.locator(".analogy").count()} analogies`);
step("figures drawn", (await page.locator(".studio-block .scene").count()) > 0, `${await page.locator(".studio-block .scene").count()} scenes`);
step("literal step text kept", (await page.locator(".groups .check label > span:first-child").first().innerText()).length > 5);
await shot("s01-themed-tasks");

// 2. Tick a step from the board
await page.locator(".board .stop:not(.stop-finish)").first().click();
step("board stop ticks the step", (await page.locator(".groups input[type=checkbox]:checked").count()) === 1);

// 3. Chat explains with the interest
await page.getByRole("button", { name: "Chat", exact: true }).click();
const ask = async (q) => {
  await page.locator("#chat-input").fill(q);
  await page.locator(".composer button[type=submit]").click();
  await chatIdle();
};
await ask("¿Qué significa un análisis crítico? Explícamelo.");
const reply = await page.locator(".msg-assistant").last().innerText();
step("chat answers using football", /f[úu]tbol|partido|equipo|jugad|cancha|gol/i.test(reply), reply.slice(0, 200));
await shot("s02-chat-analogy");

// 4. Clara proposes settings; nothing changes until Apply; Undo restores
const before = { text: await html("text"), motion: await html("motion") };
await ask("La letra se ve muy pequeña y me distraen las animaciones.");
const card = page.locator(".change-card").last();
step("settings proposal shown", await card.isVisible().catch(() => false), (await card.innerText().catch(() => "")).slice(0, 200));
step("nothing changed before Apply", (await html("text")) === before.text && (await html("motion")) === before.motion);
await shot("s03-proposal");
await card.getByRole("button", { name: "Aplicar" }).click().catch(() => {});
const after = { text: await html("text"), motion: await html("motion") };
step("Apply changes the settings", after.text !== before.text || after.motion !== before.motion, JSON.stringify(after));
await card.getByRole("button", { name: "Deshacer" }).click().catch(() => {});
step("Undo restores them", (await html("text")) === before.text && (await html("motion")) === before.motion);

// 5. Desktop, light theme
await page.setViewportSize({ width: 1280, height: 900 });
await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
await page.getByRole("button", { name: "Mis tareas" }).first().click().catch(() => {});
await page.locator(".row-card").first().click().catch(() => {});
await page.locator(".board").waitFor({ timeout: 10_000 }).catch(() => {});
await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
await shot("s04-desktop-light");

// 6. Settings section
await page.getByRole("button", { name: "Ajustes" }).click();
step("personalization settings", await page.locator("#personal-h").isVisible());
await page.locator("#personal-h").screenshot({ path: `${out}/s05-settings-head.png` }).catch(() => {});
await shot("s05-settings");

// 7. Switch the theme in Settings: the analogies must be remade in the new theme
await page.getByRole("radio", { name: "Videojuegos" }).check();
step("choosing a theme renames the interest", (await page.locator("#interest").inputValue()) === "Videojuegos");
await page.getByRole("button", { name: "Mis tareas" }).first().click();
await page.locator(".row-card").first().click();
await page.waitForFunction(() => /Videojuegos/.test(document.querySelector("#analogies-h")?.textContent ?? "") || document.querySelector(".studio .notice-warn"), null, { timeout: 150_000 });
const heading = await page.locator("#analogies-h").innerText().catch(() => "");
const analogyText = await page.locator(".analogies").innerText().catch(() => "");
step("analogies remade in the new theme", /Videojuegos/.test(heading) && /juego|nivel|jefe|misi[oó]n|personaje|partida|vida|power|boss|quest/i.test(analogyText), `${heading} · ${analogyText.slice(0, 160)}`);
step("pack follows", /Videojuegos/.test(await page.locator("#studio-h").innerText()));

// 8. Rehacer really makes it again
await page.getByRole("button", { name: "Rehacer" }).click();
step("Rehacer starts a new theme", await page.getByText(/preparando tu vista/).waitFor({ timeout: 5000 }).then(() => true, () => false));
await page.locator(".analogy").first().waitFor({ timeout: 150_000 });
await page.waitForFunction(() => !document.querySelector(".studio .notice:not(.notice-warn)"), null, { timeout: 150_000 });

// 9. Background pictures, removable
step("background pictures shown", (await page.locator(".decor .decor-item").count()) > 0);
await shot("s06-videogames-decor");
await page.getByRole("button", { name: "Quitar fondo" }).click();
step("background can be removed", (await page.locator(".decor").count()) === 0);

await browser.close();
const ok = report.steps.filter((s) => s.ok).length;
console.log(JSON.stringify(report, null, 2));
console.log(`${ok}/${report.steps.length} steps ok, ${report.pageErrors.length} page errors`);
process.exit(ok === report.steps.length && report.pageErrors.length === 0 ? 0 : 1);
