import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:3100/samples/', { waitUntil: 'networkidle' });
console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(e => ({ tag: e.tagName, c: e.className, width: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right, overflow: getComputedStyle(e).overflowX })).filter(e => e.right > innerWidth + 1 && ['DIV','SECTION','MAIN','HEADER','SELECT','INPUT','TABLE'].includes(e.tag))));
await page.screenshot({ path: 'artifacts/samples-mobile.png', fullPage: true });
await browser.close();
