import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { TODAY } from "../src/lib/utils";

const base = process.env.TEST_URL || "http://127.0.0.1:3100";
const origin = { Origin: base };

async function login(request: APIRequestContext) {
  const response = await request.post("/api/auth/login/", {
    headers: origin,
    data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
}

test("sample track totals persist and invalid distributions are rejected", async ({ request }) => {
  await login(request);
  const sample = {
    code: `TRACK-API-${randomBytes(5).toString("hex")}`,
    material: "Бетон", grade: "M400", project: "Track verification", element: "Төмөр бетон дэр",
    castingDate: TODAY, registeredDate: TODAY, age: 28, count: 6, status: "Бүртгэсэн",
    technician: "Verification Administrator", photos: [],
    product: "sleeper", track1Count: 1, track2Count: 2, track3Count: 3,
  };
  for (const invalid of [
    { track1Count: -1, count: 4 }, { track1Count: 1.5 }, { count: 7 },
    { track1Count: 0, track2Count: 0, track3Count: 0, count: 0 },
    { track1Count: 100, count: 105 }, { material: "Элс" },
    { product: "other" }, { product: "unknown" },
  ]) {
    const response = await request.post("/api/samples/", { headers: origin, data: { data: { ...sample, ...invalid } } });
    expect(response.status(), JSON.stringify(invalid)).toBe(422);
  }
  const created: { id: string; version: number }[] = [];
  try {
    for (const product of ["sleeper", "ot-slab", "other"]) {
      const data: Record<string, unknown> = { ...sample, code: `${sample.code}-${product}`, product };
      if (product === "other") {
        delete data.product;
        delete data.track1Count;
        delete data.track2Count;
        delete data.track3Count;
      }
      const response = await request.post("/api/samples/", { headers: origin, data: { data } });
      expect(response.status(), await response.text()).toBe(201);
      const record = (await response.json()).data;
      created.push(record);
      const saved = (await (await request.get(`/api/samples/${record.id}/`)).json()).data;
      expect(saved).toMatchObject({ product, count: 6, track1Count: product === "other" ? 0 : 1, track2Count: product === "other" ? 0 : 2, track3Count: product === "other" ? 0 : 3 });
      if (product !== "other") {
        const updated = await request.patch(`/api/samples/${record.id}/`, {
          headers: origin,
          data: { version: record.version, data: { track1Count: 0, track2Count: 4, track3Count: 0, count: 4 } },
        });
        expect(updated.ok(), await updated.text()).toBeTruthy();
        const next = (await updated.json()).data;
        created[created.length - 1] = next;
        expect(next).toMatchObject({ track1Count: 0, track2Count: 4, track3Count: 0, count: 4 });
        const invalidUpdate = await request.patch(`/api/samples/${record.id}/`, {
          headers: origin, data: { version: next.version, data: { count: 5 } },
        });
        expect(invalidUpdate.status()).toBe(422);
      }
    }
  } finally {
    for (const record of created) {
      const response = await request.delete(`/api/samples/${record.id}/`, { headers: origin, data: { version: record.version } });
      expect(response.ok()).toBeTruthy();
    }
  }
});

test("both products support track entry, reload, filtering, details and CSV", async ({ page }) => {
  test.setTimeout(120000);
  await login(page.request);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const suffix = randomBytes(5).toString("hex");
  const created: { id: string; version: number }[] = [];
  try {
    await page.goto("/samples/");
    for (const [product, label, counts] of [
      ["sleeper", "Төмөр бетон дэр", [2, 0, 3]],
      ["ot-slab", "Оюу толгойн хавтан", [0, 4, 0]],
    ] as const) {
      const code = `TRACK-UI-${suffix}-${product}`;
      await page.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
      const modal = page.getByRole("dialog");
      await modal.getByLabel("Бүтээгдэхүүн", { exact: false }).selectOption(product);
      await modal.getByLabel("Сорьцын код").fill(code);
      await modal.getByLabel("Төсөл").fill(`Track UI ${suffix}`);
      await expect(modal.getByLabel("Бүтээц / авсан байршил")).toHaveValue(label);
      await modal.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
      await expect(modal.locator(".field-error").first()).toBeVisible();
      for (let index = 0; index < 3; index++) {
        await modal.getByLabel(`${index + 1}-р зам — дээжийн тоо`, { exact: true }).fill(String(counts[index]));
      }
      const total = counts.reduce((sum: number, count) => sum + count, 0);
      await expect(modal.getByLabel("Сорьцын тоо")).toHaveValue(String(total));
      await expect(modal.getByLabel("Сорьцын тоо")).toHaveAttribute("readonly", "");
      const saveResponse = page.waitForResponse((response) => response.url().endsWith("/api/samples/") && response.request().method() === "POST");
      await modal.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
      const response = await saveResponse;
      expect(response.status(), await response.text()).toBe(201);
      created.push((await response.json()).data);
      await expect(modal).not.toBeVisible();
      await page.reload();
      await page.getByLabel("Сорьц хайх").fill(code);
      const row = page.locator(".data-table tbody tr").filter({ hasText: code });
      await expect(row).toContainText(label);
      await expect(row).toContainText(`${total} ширхэг`);
      await row.getByRole("button").click();
      const detail = page.getByRole("dialog");
      await expect(detail.locator(".sample-track-detail dd")).toHaveText(counts.map((count) => `${count} дээж`));
      await page.keyboard.press("Escape");
      await expect(detail).not.toBeVisible();
    }
    await page.getByLabel("Сорьц хайх").fill(suffix);
    await page.getByLabel("Бүтээгдэхүүнээр шүүх").selectOption("sleeper");
    await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
    await page.getByLabel("Замаар шүүх").selectOption("track2Count");
    await expect(page.getByText("Илэрц олдсонгүй", { exact: true })).toBeVisible();
    await page.getByLabel("Бүтээгдэхүүнээр шүүх").selectOption("ot-slab");
    await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Татах", exact: true }).click();
    const download = await downloading;
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv).toContain('"Бүтээгдэхүүн","1-р зам","2-р зам","3-р зам"');
    expect(csv).toContain('"Оюу толгойн хавтан","0","4","0"');

    await page.getByRole("button", { name: "Бүх бүтээгдэхүүн", exact: true }).click();
    await page.screenshot({ path: ".verification/sample-tracks-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".sample-product-card")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Бүтээгдэхүүн", { exact: false }).selectOption("sleeper");
    await modal.getByLabel("1-р зам — дээжийн тоо", { exact: true }).fill("8");
    await expect(modal.getByLabel("Сорьцын тоо")).toHaveValue("8");
    await modal.getByLabel("1-р зам — дээжийн тоо", { exact: true }).fill("");
    await expect(modal.getByLabel("Сорьцын тоо")).toHaveValue("0");
    await page.screenshot({ path: ".verification/sample-tracks-mobile.png", fullPage: true });
    await modal.getByLabel("Бүтээгдэхүүн", { exact: false }).selectOption("other");
    await expect(modal.getByLabel("1-р зам — дээжийн тоо", { exact: true })).toHaveCount(0);
    await expect(modal.getByLabel("Сорьцын тоо")).toBeEditable();
    await expect(modal.getByLabel("Сорьцын тоо")).toHaveValue("6");
    await modal.getByLabel("Бүтээгдэхүүн", { exact: false }).selectOption("ot-slab");
    await expect(modal.getByLabel("1-р зам — дээжийн тоо", { exact: true })).toHaveValue("0");
    expect(errors).toEqual([]);
  } finally {
    for (const record of created) {
      const response = await page.request.delete(`/api/samples/${record.id}/`, { headers: origin, data: { version: record.version } });
      expect(response.ok()).toBeTruthy();
    }
  }
});
