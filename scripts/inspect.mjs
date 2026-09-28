import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1060 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3100", { waitUntil: "networkidle" });
await page
  .getByRole("heading", { name: "Хяналтын самбар", exact: true })
  .waitFor();
await page.screenshot({
  path: "artifacts/dashboard-desktop.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    title: await page.title(),
    errors,
    width: await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    })),
  }),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "artifacts/dashboard-mobile.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    mobile: await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    })),
  }),
);
await page.setViewportSize({ width: 1440, height: 1000 });
for (const [name, route] of [
  ['equipment', '/equipment/'],
  ['compression-form', '/forms/?type=compression'],
  ['report', '/reports/'],
]) {
  await page.goto(`http://127.0.0.1:3100${route}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  await page.screenshot({ path: `artifacts/${name}-desktop.png`, fullPage: true });
}
await browser.close();
