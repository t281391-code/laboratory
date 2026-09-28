import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
for (const route of [
  "/",
  "/forms/?type=compression",
  "/equipment/",
  "/reports/",
]) {
  await page.goto(`http://127.0.0.1:3100${route}`, {
    waitUntil: "networkidle",
  });
  const failures = await page.evaluate(() => {
    const rgb = (value) => (value.match(/[\d.]+/g) || []).map(Number);
    const lum = (values) =>
      values
        .slice(0, 3)
        .map((x) => x / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
        .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
    const results = [];
    for (const element of document.querySelectorAll("body *")) {
      if (
        !Array.from(element.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        )
      )
        continue;
      if (!element.checkVisibility() || element.closest("svg")) continue;
      const cs = getComputedStyle(element);
      const foreground = rgb(cs.color);
      let background = [255, 255, 255];
      for (
        let ancestor = element;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const color = rgb(getComputedStyle(ancestor).backgroundColor);
        if (color.length === 3 || color[3] === 1) {
          background = color;
          break;
        }
      }
      const light = lum(foreground);
      const dark = lum(background);
      const ratio =
        (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
      const size = parseFloat(cs.fontSize);
      const threshold =
        size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
      if (ratio < threshold)
        results.push({
          selector: element.className || element.tagName,
          text: element.textContent.trim().slice(0, 45),
          color: cs.color,
          background,
          ratio: +ratio.toFixed(2),
        });
    }
    return results;
  });
  console.log(route, JSON.stringify(failures));
}
await browser.close();
