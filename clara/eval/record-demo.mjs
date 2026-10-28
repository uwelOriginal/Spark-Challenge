// Records the partner demo video (REAL AI calls, Spanish captions) with the system Chrome.
// Usage: npm run build && npm start (other terminal), then: CLARA_URL=http://localhost:3000 npm run video
// Output: demo/clara-demo-es.webm
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "demo");
fs.mkdirSync(outDir, { recursive: true });
const BASE = process.env.CLARA_URL ?? "http://localhost:3000";
const size = { width: 1280, height: 800 };

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: size, recordVideo: { dir: outDir, size } });
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const tab = (name) => page.locator(".tabs").getByRole("button", { name: new RegExp(`^${name}`) }).click();
const top = () => page.evaluate(() => window.scrollTo(0, 0));

async function caption(text) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:calc(50% + 124px);bottom:24px;transform:translateX(-50%);max-width:860px;width:calc(100% - 320px);" +
        "background:#14213d;color:#fff;font:600 21px/1.4 system-ui,sans-serif;padding:14px 20px;" +
        "border-radius:14px;z-index:9999;text-align:center;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
async function scrollBy(px, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px / steps);
    await wait(220);
  }
}

await page.goto(BASE);
await caption("Clara · prototipo para estudiantes neurodivergentes · Demo para Surfeando la Neurodiversidad");
await wait(5000);
await caption("Clara junta lo que dice Canvas con lo que el profesor dijo en clase, y no adivina");
await wait(5000);

await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
await caption("1. Ejemplo sintético: instrucciones de Canvas + transcripción de la clase (solo la voz de la profesora)");
await page.getByText(/Clara comprobó \d+ de \d+ datos/).waitFor({ timeout: 150_000 });
await caption("2. Resumen literal. Cada dato se comprobó palabra por palabra contra las fuentes");
await wait(6000);
await scrollBy(420);
await caption("3. Fuentes: Clara detecta que Canvas y la clase no coinciden");
await wait(6000);

await top();
await tab("Dudas");
await caption("4. Lo que no está claro: Clara pregunta en vez de adivinar");
await wait(6000);
await scrollBy(900, 8);
await caption("5. Mensaje listo para el profesor. Se abre en el correo; la estudiante decide si lo envía");
await wait(6000);

await top();
await tab("Pregúntale");
await caption("6. Chat que solo responde con lo que dicen tus fuentes, y muestra dónde lo dicen");
await page.getByRole("button", { name: "¿Cuántas palabras debe tener?" }).click();
await page.waitForFunction(() => document.querySelectorAll(".msg-assistant").length > 0 && !document.body.innerText.includes("Clara está buscando"), null, { timeout: 90_000 });
await page.locator(".msg-assistant .quote summary").first().click();
await wait(7000);

await top();
await tab("Pasos");
await caption("7. Un primer paso pequeño, con 'terminado cuando…'");
await wait(5000);

await tab("Calendario");
await caption("8. Fechas y recordatorios a tu calendario: el teléfono avisa con sus propias notificaciones");
await wait(7000);

await tab("Cambios");
await caption("9. El profesor publicó una versión nueva: qué cambió, qué hacer y qué sigue igual");
await page.getByRole("button", { name: "Usar la versión nueva del ejemplo" }).click();
await wait(1500);
await page.getByRole("button", { name: "Agregar y comparar" }).click();
await page.getByRole("heading", { name: "Qué cambió" }).first().waitFor({ timeout: 150_000 });
await scrollBy(500);
await wait(6000);
await scrollBy(500);
await wait(4000);

await top();
await tab("Mentor");
await caption("10. Opcional: resumen para su surfer, por WhatsApp. Ella decide qué se comparte");
await wait(6000);

await page.locator(".sidebar").getByRole("button", { name: "Hoy" }).click();
await caption("11. Hoy: tu siguiente paso, tus entregas y lo que falta preguntar");
await wait(6000);

await page.locator(".sidebar").getByRole("button", { name: "Nueva" }).click();
await caption("12. Fuentes: texto, PDF o foto, audio de la clase, transcripción de Teams o Canvas");
await wait(4000);
await page.getByRole("button", { name: "Desde Canvas" }).click();
await page.getByRole("button", { name: "Usar Canvas de ejemplo" }).click();
await page.getByText("Elige una tarea").waitFor({ timeout: 30_000 });
await scrollBy(300);
await wait(5000);

await caption("Prototipo en desarrollo. Queremos su retroalimentación: ¿qué sirve, qué sobra, qué falta?");
await wait(5000);

const video = page.video();
await context.close();
await browser.close();
const target = path.join(outDir, "clara-demo-es.webm");
fs.rmSync(target, { force: true });
fs.renameSync(await video.path(), target);
console.log("Saved", target);
